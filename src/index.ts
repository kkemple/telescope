import './env';
import 'isomorphic-fetch';
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client';
import {
  // startOfMonth,
  // format,
  // parse,
  formatDistance,
  parseISO,
} from 'date-fns';

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

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: 'https://api.github.com/graphql',
    headers: {
      authorization: `bearer ${process.env.GITHUB_TOKEN}`,
    },
  }),
});

const generateTopTenStaleIssuesText = (staleIssues: any) => {
  return staleIssues.nodes.reduce((mem: string, val: any) => {
    const titleWithLink = `[${val.title}](${val.url})`;
    const truncatedBody = `${val.bodyText.substr(0, 140)}...`;

    return `${mem}\n...\n${titleWithLink}\n${truncatedBody}`;
  }, '');
};

const generateTopTenActiveIssuesText = (activeIssues: any) => {
  return activeIssues.nodes.reduce((mem: string, val: any) => {
    const titleWithLink = `[${val.title}](${val.url})`;
    const truncatedBody = `${val.bodyText.substr(0, 140)}...`;
    const updatedAt = `${formatDistance(parseISO(val.updatedAt), new Date())}`;
    const totalCommentCount = val.comments.totalCount
      ? val.comments.totalCount
      : 'no';
    const totalReactionCount = val.comments.totalCount
      ? val.comments.totalCount
      : 'no';
    const details = `There are ${totalCommentCount} comments on this issue, and it has ${totalReactionCount} reactions. It was last updated ${updatedAt} ago.`;

    return `${mem}\n...\n${titleWithLink}\n${details}\n${truncatedBody}`;
  }, '');
};

async function main(): Promise<void> {
  try {
    const {
      data: {
        organization: { repository },
      },
    }: GitHubResponse = await client.query({ query: QUERY });

    /**
     * Avg time since last interaction on issue
     * Avg time to respond to issues
     * Avg time to close issues
     * Number of open PRs
     * Avg time to merge PRs
     * Avg time to review PRs
     * Avg time between review and merge
     */

    // const numberOfOpenIssues: number = repository.openIssuesForStats.totalCount;

    const topTenStaleIssues: string = generateTopTenStaleIssuesText(
      repository.topTenStaleIssues
    );
    const topTenActiveIssues: string = generateTopTenActiveIssuesText(
      repository.topTenActiveIssues
    );
    console.log(topTenActiveIssues, topTenStaleIssues);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
