// globals
import 'isomorphic-fetch';
import './env';

import outdent from 'outdent';
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  gql,
  NormalizedCacheObject,
} from '@apollo/client';
import { format } from 'date-fns';

import generateReportForRepository from './report-generator';

// Make into real types
type GitHubResponse = any;

const QUERY = gql`
  query GitHubData($activeSince: string) {
    organization(login: "apollographql") {
      apolloTooling: repository(name: "apollo-tooling") {
        name
        openIssuesForStats: issues(last: 100, states: OPEN) {
          totalCount
          nodes {
            createdAt
            updatedAt
            url
            assignees {
              totalCount
            }
            comments(first: 100) {
              totalCount
              nodes {
                createdAt
              }
            }
          }
        }
        closedIssuesForStats: issues(last: 100, states: CLOSED) {
          nodes {
            createdAt
            closedAt
            comments(first: 1) {
              nodes {
                createdAt
              }
            }
          }
        }
        topTenActiveIssues: issues(
          last: 10
          states: OPEN
          filterBy: { since: $activeSince }
        ) {
          nodes {
            updatedAt
            url
            title
            bodyText
            reactions {
              totalCount
            }
            comments {
              totalCount
            }
          }
        }
        topTenStaleIssues: issues(
          first: 10
          states: OPEN
          filterBy: { assignee: null }
        ) {
          nodes {
            title
            bodyText
            url
          }
        }
      }
      apolloClient: repository(name: "apollo-client") {
        name
        openIssuesForStats: issues(last: 100, states: OPEN) {
          totalCount
          nodes {
            createdAt
            updatedAt
            url
            assignees {
              totalCount
            }
            comments(first: 100) {
              totalCount
              nodes {
                createdAt
              }
            }
          }
        }
        closedIssuesForStats: issues(last: 100, states: CLOSED) {
          nodes {
            createdAt
            closedAt
            comments(first: 1) {
              nodes {
                createdAt
              }
            }
          }
        }
        topTenActiveIssues: issues(
          last: 10
          states: OPEN
          filterBy: { since: $activeSince }
        ) {
          nodes {
            updatedAt
            url
            title
            bodyText
            reactions {
              totalCount
            }
            comments {
              totalCount
            }
          }
        }
        topTenStaleIssues: issues(
          first: 10
          states: OPEN
          filterBy: { assignee: null }
        ) {
          nodes {
            title
            bodyText
            url
          }
        }
      }
      apolloServer: repository(name: "apollo-server") {
        name
        openIssuesForStats: issues(last: 100, states: OPEN) {
          totalCount
          nodes {
            createdAt
            updatedAt
            url
            assignees {
              totalCount
            }
            comments(first: 100) {
              totalCount
              nodes {
                createdAt
              }
            }
          }
        }
        closedIssuesForStats: issues(last: 100, states: CLOSED) {
          nodes {
            createdAt
            closedAt
            comments(first: 1) {
              nodes {
                createdAt
              }
            }
          }
        }
        topTenActiveIssues: issues(
          last: 10
          states: OPEN
          filterBy: { since: $activeSince }
        ) {
          nodes {
            updatedAt
            url
            title
            bodyText
            reactions {
              totalCount
            }
            comments {
              totalCount
            }
          }
        }
        topTenStaleIssues: issues(
          first: 10
          states: OPEN
          filterBy: { assignee: null }
        ) {
          nodes {
            title
            bodyText
            url
          }
        }
      }
    }
  }
`;

const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: 'https://api.github.com/graphql',
    headers: {
      authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    },
  }),
});

async function main(): Promise<void> {
  try {
    const {
      data: {
        organization: { apolloTooling, apolloClient, apolloServer },
      },
    }: GitHubResponse = await client.query({ query: QUERY });

    /**
     * Number of open PRs
     * Avg time to merge PRs
     * Avg time to review PRs
     * Avg time between review and merge
     */

    const reportTitle: string = `Health Report for Apollo OSS Repositories - ${format(
      new Date(),
      'MMMM do, yyyy'
    )}`;

    const toolingReport: string = generateReportForRepository(apolloTooling);
    const clientReport: string = generateReportForRepository(apolloClient);
    const serverReport: string = generateReportForRepository(apolloServer);

    const aggregatedReport = outdent`
      # ${reportTitle}

      ${clientReport}

      ${serverReport}

      ${toolingReport}
    `;

    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({ title: reportTitle, report: aggregatedReport }),
      });
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
