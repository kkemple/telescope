// globals
import 'isomorphic-fetch';
import './env';

import outdent from 'outdent';
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';

import config from './config';
import QUERY from './query';
import generateReportForRepository from './report-generator';

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
    const reports = await Promise.all(
      config.reports.map(async ({ org, repo }) => {
        const {
          data: {
            organization: { repository },
          },
        } = await client.query({
          query: QUERY,
          variables: {
            org,
            repo,
            activeSince: '',
          },
        });

        return generateReportForRepository(repository);
      })
    );

    const aggregatedReport = outdent`
      # ${config.title}

      ${reports.join('\n')}
    `;

    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({ title: config.title, report: aggregatedReport }),
      });
    }

    // console.log(aggregatedReport);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

main();
