import { format } from 'date-fns';

export default {
  title: `Health Report for Apollo OSS Repositories - ${format(
    new Date(),
    'MMMM do, yyyy'
  )}`,
  reports: [
    {
      org: 'apollographql',
      repo: 'apollo-client',
    },
    {
      org: 'apollographql',
      repo: 'apollo-server',
    },
    {
      org: 'apollographql',
      repo: 'apollo-tooling',
    },
    {
      org: 'apollographql',
      repo: 'apollo-ios',
    },
    {
      org: 'apollographql',
      repo: 'apollo-android',
    },
    {
      org: 'apollographql',
      repo: 'react-apollo',
    },
    {
      org: 'apollographql',
      repo: 'apollo-link',
    },
    {
      org: 'apollographql',
      repo: 'apollo-client-devtools',
    },
    {
      org: 'apollographql',
      repo: 'apollo-feature-requests',
    },
    {
      org: 'apollographql',
      repo: 'fullstack-tutorial',
    },
    {
      org: 'apollographql',
      repo: 'graphql-tag',
    },
  ],
};
