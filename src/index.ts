import './env';
import 'isomorphic-fetch';
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client';
// import { startOfMonth, format, parse } from 'date-fns';

type GitHubResponse = any;

const QUERY = gql`
  query GitHubData($activeSince: String) {
    organization(login: "apollographql") {
      repository(name: "apollo-tooling") {
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
            comments {
              totalCount
            }
          }
        }
        topTenActiveIssues: issues(
          last: 10
          states: OPEN
          filterBy: { since: $activeSince }
        ) {
          nodes {
            createdAt
            updatedAt
            url
            title
            bodyText
            assignees(last: 10) {
              nodes {
                login
                url
              }
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
            createdAt
            updatedAt
            title
            bodyText
            url
            assignees {
              totalCount
            }
          }
        }
      }
    }
  }
`;

const client = new ApolloClient({
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
        organization: { repository },
      },
    }: GitHubResponse = await client.query({ query: QUERY });
    console.log(JSON.stringify(repository.topTenActiveIssues, null, 2));
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
