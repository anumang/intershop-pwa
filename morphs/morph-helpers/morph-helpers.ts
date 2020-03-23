import { ConditionalExpression, Expression, SourceFile } from 'ts-morph';

/**
 * helper: construct on()-arguments from case identifier and possible preceding empty case identifiers
 * @param identifier switch-case text
 * @param previousIdentifiers array of switch-case texts of previous empty clauses
 */
export function createActionTypes(identifier: string, previousIdentifiers: string[]): string {
  if (previousIdentifiers.length > 9) {
    throw new Error('Error: too many empty clauses. on() takes at most 10 arguments.');
  }
  const newId = `${standardizeIdentifier(identifier)}`;
  const newPrevId = previousIdentifiers.map(i => `${standardizeIdentifier(i)}`).join(', ');
  return previousIdentifiers.length === 0 ? newId : `${newId}, ${newPrevId}`;
}

/**
 * returns the new action name from an ActionClass or Action multiple export
 * @param identifier string that contains the action name
 */
export function standardizeIdentifier(identifier: string) {
  return identifier.includes('.')
    ? identifier.split('.')[1].replace(/^\w/, c => c.toLowerCase())
    : identifier.replace(/^\w/, c => c.toLowerCase());
}

/**
 * helper: checks whether the given expression text belongs to a map operator
 * @param identifier expression text
 */
export function isMap(identifier: string) {
  return identifier === 'map' || 'concatMap' || 'mergeMap' || 'switchMap' || 'mapTo';
}

/**
 * helper: construct string for a action call, using the action's class and possible arguments
 * @param actionClassString actionClass name
 * @param argumentString optional, argument string for the action call
 */
export function updateNewExpressionString(actionClassString: string, argumentString: string = ''): string {
  return `${actionClassString.replace(/^\w/, c => c.toLowerCase())}(${argumentString})`;
}

/**
 * helper: searches the given sourceFile for namespace imports and throws an error if one exists
 * @param sourceFile sourceFile to check
 */
export function checkForNamespaceImports(sourceFile: SourceFile) {
  sourceFile.getImportDeclarations().forEach(im => {
    if (im.getNamespaceImport()) {
      throw new Error('please ensure your store files include no star imports');
    }
  });
}

/**
 * returns expression from conditional as array
 */
export function getConditionalWhenExpressions(conditional: ConditionalExpression): Expression[] {
  return [conditional.getWhenTrue(), conditional.getWhenFalse()];
}
