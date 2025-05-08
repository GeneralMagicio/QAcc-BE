import { GraphQLScalarType } from 'graphql';

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown) {
    if (!(value instanceof Date)) {
      throw new Error('Expected value to be a Date');
    }
    return value.toISOString(); // Convert outgoing Date to ISO String for JSON
  },
  parseValue(value: unknown) {
    if (typeof value !== 'string') {
      throw new Error('DateTime must be a string');
    }
    return new Date(value); // Convert incoming ISO String to Date
  },
  parseLiteral(ast) {
    if (ast.kind === 'StringValue') {
      return new Date(ast.value); // Convert hard-coded AST string to Date
    }
    return null; // Invalid hard-coded value (not a string)
  },
});
