import * as React from "react";
import { useEffect, useState } from "react";
import {MavenVersion, getLatestJar, getMavenDownloads} from "@app/utils/mavenDownloads";
import {
  Button,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  PageSection,
  Title
} from "@patternfly/react-core";

export interface DownloadComponentProps {
  projectName: string;
  artifactId: string;
  groupId: string;
  ignoredVersions?: string[];
}

const DownloadComponent: React.FC<DownloadComponentProps> = (props) => {
  const [data, setData] = useState<MavenVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const result = await getMavenDownloads(props.groupId, props.artifactId, new Set<string>(props.ignoredVersions));
        setData(result);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [props.groupId, props.artifactId, props.ignoredVersions]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  if (data.length === 1) {
    return (
      <>
        <PageSection>
          <p>Download the latest build <Button component="a"
                                               href={getLatestJar(props.groupId, props.artifactId, data[0].version)}
                                               variant="link" isInline>here</Button>.</p>
        </PageSection>
        <PageSection>
          <Title headingLevel="h1" size="lg">{props.projectName}</Title>
          <DataList aria-label={props.projectName}>
            <BuildsComponent artifacts={data[0].artifacts} version={data[0].version} />
          </DataList>
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageSection>
        <p>Download the latest build <Button component="a"
                                             href={getLatestJar(props.groupId, props.artifactId)}
                                             variant="link" isInline>here</Button>.</p>
      </PageSection>
      {data.map(value => (
        <PageSection key={value.version} hasBodyWrapper={false}>
          <Title headingLevel="h1" size="lg">{props.projectName} - {value.version}</Title>
          <DataList aria-label={value.version}>
            <BuildsComponent artifacts={value.artifacts} version={value.version} />
          </DataList>
        </PageSection>
      ))}
    </>
  );
};

const styles = {
  flex: '1 1 10%'
}

const getCommitUrl = (properties: object) => {
  const commit = properties["git.commit.id"];
  const repo = properties["github.repo"];
  return `https://github.com/${repo}/commit/${commit}`;
};

const BuildsComponent: React.FC<MavenVersion> = (props) => {
  return (
    <>
      {props.artifacts.map(value => (
        <DataListItem key={value.downloadUrl} aria-labelledby={value.build}>
          <DataListItemRow>
            <DataListItemCells
              dataListCells={[
                <DataListCell key="Id">#{value.build}</DataListCell>,
                <DataListCell key="Changes" style={styles}>
                    {value.properties["git.commit.id"] && value.properties["github.repo"] && value.properties["git.commit.message.short"]
                      ? <a href={getCommitUrl(value.properties)}>{value.properties["git.commit.message.short"]}</a>
                      : value.properties["git.commit.message.short"] || null}
                </DataListCell>,
                <DataListCell key="URL">
                  <Button component="a" href={value.downloadUrl} variant="primary">Download</Button>
                </DataListCell>,
                <DataListCell key="Hash">
                  <Button component="a" href={value.downloadUrl + ".sha1"} variant="secondary">SHA1</Button>
                </DataListCell>
              ]}
            />
          </DataListItemRow>
        </DataListItem>
      ))}
    </>
  );
};

export { DownloadComponent };
