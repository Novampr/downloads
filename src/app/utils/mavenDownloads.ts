import axios from "axios";

const REPO_URL = "https://repo.opencollab.dev";
const REPOSITORY = "maven-snapshots";
const MAVEN_VERSIONS = `${REPO_URL}/api/maven/versions/${REPOSITORY}`;
const MAVEN_DETAILS = `${REPO_URL}/api/maven/details/${REPOSITORY}`;
const MAVEN_DOWNLOADS = `${REPO_URL}/${REPOSITORY}`;
const MAVEN_LATEST = `${REPO_URL}/api/maven/latest/file/${REPOSITORY}`;

export interface MavenVersion {
    version: string;
    artifacts: MavenArtifact[];
}

export interface MavenArtifact {
    build: string;
    name: string;
    downloadUrl: string;
    properties: object;
}

const fetchData = async (url: string) => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

const getProperties = async (url: string): Promise<object> => {
    try {
        const response = await axios.get(url, { responseType: 'text' });
        const properties = response.data;
        // Parse properties file
        return properties.split('\n').reduce((acc, line) => {
            const [key, value] = line.split('=');
            acc[key] = value;
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching data:', error);
        return {};
    }
};

export async function getMavenDownloads(groupId: string, artifactId: string, ignoredVersions: Set<string> = new Set(), acceptedVersions: Set<string> = new Set()): Promise<MavenVersion[]> {
    const path = `${groupId.replace(/\./g, '/')}/${artifactId}`;
    const versionData = await fetchData(`${MAVEN_VERSIONS}/${path}`);

    let versions: MavenVersion[] = [];
    for (const version of versionData.versions) {
        if (ignoredVersions.has(version)) {
            continue;
        }

        if (acceptedVersions.size > 0) {
            let accepted = false;

            acceptedVersions.forEach(function(acceptedVersion) {
                if (accepted) return;
                if (version.match(new RegExp(acceptedVersion, "i"))) accepted = true;
            });

            if (!accepted) continue;
        }

        const details = await fetchData(`${MAVEN_DETAILS}/${path}/${version}`);
        const builds = new Map<string, MavenArtifact>()

        const versionWithoutSnapshot = version.replace(/-SNAPSHOT$/, '');
        const versionRegex = new RegExp(`^(${artifactId}-${versionWithoutSnapshot}-([0-9]{8}\\.[0-9]{6})-([0-9]+)\\.jar)$`);
        const propertiesRegex = new RegExp(`^(${artifactId}-${versionWithoutSnapshot}-([0-9]{8}\\.[0-9]{6})-([0-9]+)\\.properties)$`);
        for (const file of details.files) {
            const name = file.name;
            const match = versionRegex.exec(name);
            if (!match) {
                const propMatch = propertiesRegex.exec(name);
                if (!propMatch) {
                    continue;
                }

                const properties = await getProperties(`${MAVEN_DOWNLOADS}/${path}/${version}/${propMatch[1]}`);
                const build = propMatch[3];
                if (builds.has(build)) {
                    builds.get(build)!.properties = properties;
                }
                continue;
            }
            const build = match[3];
            builds.set(build, {
                build: build,
                name: match[1],
                downloadUrl: `${MAVEN_DOWNLOADS}/${path}/${version}/${match[1]}`,
                properties: {}
            });
        }

        // Skip versions with no matching JAR builds
        if (builds.size === 0) {
            continue;
        }

        // Convert to array and reverse order (newest build first)
        let buildsList = Array.from(builds.values());
        buildsList = buildsList.reverse();

        versions.push({
            version,
            artifacts: buildsList
        });
    }
    versions = versions.reverse();
    return versions;
}

export function getLatestJar(groupId: string, artifactId: string, version: string | undefined = undefined): string {
    const path = `${groupId.replace(/\./g, '/')}/${artifactId}`;
    if (version) {
        return `${MAVEN_LATEST}/${path}/${version}?extension=jar`;
    }
    return `${MAVEN_LATEST}/${path}?extension=jar`;
}
