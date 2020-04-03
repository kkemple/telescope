import outdent from 'outdent';
import { parseISO, differenceInDays } from 'date-fns';

type PullRequest = {
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string;
  mergedAt: string;
  bodyText: string;
  title: string;
  url: string;
  reviews: {
    totalCount: number;
    nodes: {
      createdAt: string;
      updatedAt: string;
      state:
        | 'COMMENTED'
        | 'PENDING'
        | 'APPROVED'
        | 'CHANGES_REQUESTED'
        | 'DISMISSED';
    }[];
  };
  reactions: {
    totalCount: number;
    nodes: {
      content: string;
    };
  };
  comments: {
    totalCount: number;
    nodes: {
      createdAt: string;
    }[];
  };
};

type PullRequests = {
  totalCount: number;
  nodes: PullRequest[];
};

export type RepositoryPRs = {
  name: string;
  openPullRequests: PullRequests;
  mergedPullRequests: PullRequests;
  topTenActivePRs: PullRequests;
  topTenStalePRs: PullRequests;
};

const generateTopTenStalePRsText = (stalePRs: PullRequests) => {
  const stalePRsText: string = stalePRs.nodes.reduce(
    (mem: string, val: PullRequest) => {
      const titleWithLink = `[${val.title}](${val.url})`;
      const truncatedBody = `${val.bodyText.substr(0, 140)}`;

      return `${mem}${titleWithLink}<br />${truncatedBody}...<br /><br />`;
    },
    ''
  );

  return outdent`
    **Top Stale PRs**

    ${stalePRsText}
  `;
};

const generateTopTenActivePRsText = (activePRs: PullRequests) => {
  const activePRsText: string = activePRs.nodes.reduce(
    (mem: string, val: PullRequest) => {
      const titleWithLink = `[${val.title.replace('#', '\\#')}](${val.url})`;
      const truncatedBody = `${val.bodyText
        .substr(0, 140)
        .replace('#', '\\#')}`;
      const totalCommentCount = val.comments.totalCount
        ? val.comments.totalCount
        : 'no';
      const totalReactionCount = val.comments.totalCount
        ? val.comments.totalCount
        : 'no';
      const details = `**There are ${totalCommentCount} comments on this issue, and it has ${totalReactionCount} reactions.**`;

      return `${mem}${titleWithLink}<br />${details}<br />${truncatedBody}...<br /><br />`;
    },
    ''
  );

  return outdent`
    **Top Active PRs**

    ${activePRsText}
  `;
};

const generateAvgTimeToMergePRText = (prs: PullRequests): string => {
  const totalDaysSinceLastUpdate: number = prs.nodes.reduce(
    (mem: number, val: PullRequest) => {
      const createdAt: Date = parseISO(val.createdAt);
      const mergedAt: Date = parseISO(val.mergedAt);
      const diff = differenceInDays(mergedAt, createdAt);

      return mem + diff;
    },
    0
  );

  const avg = totalDaysSinceLastUpdate / prs.nodes.length;

  return `On averge it takes ${avg} days to merge a PR.`;
};

// const generateAvgTimeToReviewPRsText = (mergedPullRequests: PullRequests) => {
//   const prsWithoutReviews: any = [];
//   const prsWithReviews: any[] = [];

//   mergedPullRequests.nodes.map((node: PullRequest) => {
//     if (node.reviews.totalCount) {
//       prsWithReviews.push(node);
//     } else {
//       prsWithoutReviews.push(node);
//     }
//   });

//   if (!prsWithReviews.length) {
//     return `No PRs out of the last ${mergedPullRequests.nodes.length} have reviews.`;
//   }

//   const totalDaysBetweenFirstResponse: number = prsWithReviews.reduce(
//     (mem: number, val: PullRequest) => {
//       const reviewCreatedAt = val.reviews.nodes[0].createdAt;
//       const prCreatedAt = val.createdAt;
//       return (
//         mem + differenceInDays(parseISO(reviewCreatedAt), parseISO(prCreatedAt))
//       );
//     },
//     0
//   );

//   const avg = totalDaysBetweenFirstResponse / prsWithReviews.length;

//   return `On average it takes about ${Math.round(
//     avg
//   )} day(s) to review a PR. There are currently ${
//     prsWithoutReviews.length
//   } PRs out of the last 100 that have not been reviewed.`;
// };

// const generateAvgTimeToMergeReviewedPRsText = (
//   mergedPullRequests: PullRequests
// ): string => {
//   const approvedPRs: PullRequest[] = mergedPullRequests.nodes.filter(
//     (node: PullRequest) => !!node.reviews.totalCount
//   );

//   const totalDaysBetweenFirstResponse: number = approvedPRs.reduce(
//     (mem: number, val: PullRequest) => {
//       return (
//         mem +
//         differenceInDays(
//           parseISO(val.reviews.nodes[val.reviews.nodes.length - 1].updatedAt),
//           parseISO(val.mergedAt)
//         )
//       );
//     },
//     0
//   );

//   const avg = totalDaysBetweenFirstResponse / approvedPRs.length;

//   return `On average it takes about ${Math.round(
//     avg
//   )} day(s) to merge a reviewed PR.`;
// };

export default (repository: RepositoryPRs): string => {
  const numberOfOpenPRs: string = `There are ${repository.openPullRequests.totalCount} open PRs currently.`;

  const avgTimeToMergePRs: string = generateAvgTimeToMergePRText(
    repository.mergedPullRequests
  );

  const topTenStalePRs: string = generateTopTenStalePRsText(
    repository.topTenStalePRs
  );

  const topTenActivePRs: string = generateTopTenActivePRsText(
    repository.topTenActivePRs
  );

  const report: string = outdent`
    ### Pull Requests

    - ${numberOfOpenPRs}
    - ${avgTimeToMergePRs}

    ${topTenActivePRs}

    ${topTenStalePRs}
  `;

  return report;
};
