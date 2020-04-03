import { gql } from '@apollo/client';

export default gql`
  fragment openIssue on Issue {
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

  fragment closedIssue on Issue {
    createdAt
    closedAt
    comments(first: 1) {
      nodes {
        createdAt
      }
    }
  }

  fragment activeIssue on Issue {
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

  fragment staleIssue on Issue {
    title
    bodyText
    url
  }

  fragment activePR on PullRequest {
    updatedAt
    lastEditedAt
    url
    title
    bodyText
    reactions(first: 10) {
      totalCount
      nodes {
        content
      }
    }
    comments {
      totalCount
    }
  }

  fragment stalePR on PullRequest {
    title
    bodyText
    url
  }

  fragment openPullRequest on PullRequest {
    createdAt
    updatedAt
    bodyText
    reviews(last: 1) {
      nodes {
        updatedAt
        state
      }
    }
  }

  fragment mergedPullRequest on PullRequest {
    createdAt
    updatedAt
    mergedAt
    bodyText
    reviews(last: 10) {
      totalCount
      nodes {
        updatedAt
        state
      }
    }
  }

  query GitHubData($org: String!, $repo: String!, $activeSince: String) {
    organization(login: $org) {
      repository(name: $repo) {
        name
        mergedPullRequests: pullRequests(last: 100, states: MERGED) {
          nodes {
            ...mergedPullRequest
          }
        }
        openPullRequests: pullRequests(last: 100, states: OPEN) {
          totalCount
          nodes {
            ...openPullRequest
          }
        }
        topTenActivePRs: pullRequests(
          last: 10
          states: OPEN
          orderBy: { field: COMMENTS, direction: ASC }
        ) {
          nodes {
            ...activePR
          }
        }
        topTenStalePRs: pullRequests(first: 10, states: OPEN) {
          nodes {
            ...stalePR
          }
        }
        openIssuesForStats: issues(last: 100, states: OPEN) {
          totalCount
          nodes {
            ...openIssue
          }
        }
        closedIssuesForStats: issues(last: 100, states: CLOSED) {
          nodes {
            ...closedIssue
          }
        }
        topTenActiveIssues: issues(
          last: 10
          states: OPEN
          filterBy: { since: $activeSince }
        ) {
          nodes {
            ...activeIssue
          }
        }
        topTenStaleIssues: issues(
          first: 10
          states: OPEN
          filterBy: { assignee: null }
        ) {
          nodes {
            ...staleIssue
          }
        }
      }
    }
  }
`;
