import axios from "axios";

const MAVEN_VERSIONS = "https://repo.opencollab.dev/api/maven/versions/maven-snapshots";
const MAVEN_DETAILS = "https://repo.opencollab.dev/api/maven/details/maven-snapshots";
const MAVEN_DOWNLOADS = "https://repo.opencollab.dev/maven-snapshots";

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
        throw error;
    }
};

export async function getMavenDownloads(groupId: string, artifactId: string, ignoredVersions: Set<string>): Promise<MavenVersion[]> {
    const path = `${groupId.replace(/\./g, '/')}/${artifactId}`;
    const versionData = await fetchData(`${MAVEN_VERSIONS}/${path}`);

    let versions: MavenVersion[] = [];
    for (const version of versionData.versions) {
        if (ignoredVersions.has(version)) {
            continue;
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
        // Convert to array and reverse order
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
