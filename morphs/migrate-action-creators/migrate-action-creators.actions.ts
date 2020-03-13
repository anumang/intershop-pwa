import {
  CallExpression,
  ClassDeclaration,
  NewExpression,
  SourceFile,
  SyntaxKind,
  VariableDeclarationKind,
} from 'ts-morph';

import { checkForNamespaceImports, updateNewExpressionString } from '../morph-helpers/morph-helpers';

import { ActionCreatorsMorpher } from './migrate-action-creators';

export class ActionCreatorsActionsMorpher {
  constructor(public actionsFile: SourceFile, public parent: ActionCreatorsMorpher) {}
  actionTypes: { [typeName: string]: string };

  migrateActions(updateGlobalReferences: boolean = true) {
    if (!this.actionsFile) {
      console.log('no actions file found');
      return;
    }
    console.log('replacing actions...');
    checkForNamespaceImports(this.actionsFile);
    this.readActionTypes();
    this.replaceActions(updateGlobalReferences);

    // clean up old code
    this.actionsFile.getEnums()[0].remove();
    this.actionsFile.getTypeAliases()[0].remove();
    this.actionsFile.fixMissingImports();
    this.actionsFile.fixUnusedIdentifiers();
  }

  /**
   * read action types from actions enum and save in this.actionTypes
   */
  private readActionTypes() {
    console.log('  reading action types...');
    this.actionTypes = this.actionsFile
      .getEnums()[0]
      .getMembers()
      .reduce(
        (acc, current) => ({
          ...acc,
          [current.getName()]: current.getInitializer().getText(),
        }),
        {}
      );
    console.log(`    ${Object.keys(this.actionTypes).length} actions found`);
  }

  /**
   * replace action class declaration with createAction factory call
   * @param updateGlobalReferences whether to globally update references for each action
   */
  private replaceActions(updateGlobalReferences: boolean) {
    console.log('  replacing action classes with creator functions...');
    this.actionsFile.getClasses().forEach(actionClass => {
      // retrieve basic action information
      const className = actionClass.getName();
      const typeString = this.actionTypes[className];

      // get constructor information
      const hasConstructor = actionClass.getConstructors().length > 0;
      const constructorContents = hasConstructor
        ? actionClass
            .getConstructors()[0]
            .getParameter('payload')
            .getText()
            .replace('public ', '')
        : '';

      // assemble structure object
      const createActionStructure = {
        isExported: true,
        isDefaultExport: false,
        hasDeclareKeyword: false,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: className.replace(/^\w/, c => c.toLowerCase()),
            initializer: hasConstructor
              ? `createAction(${typeString}, props<{${constructorContents}}>())`
              : `createAction(${typeString})`,
            type: undefined,
            hasExclamationToken: false,
            kind: 38,
          },
        ],
      };

      // add variable statement to file
      this.actionsFile.addVariableStatement(createActionStructure);

      // update references in other files
      if (updateGlobalReferences) {
        this.updateGlobalReferences(actionClass);
        // fix updated files
        actionClass
          .findReferencesAsNodes()
          .map(node => node.getSourceFile())
          .filter((value, index, array) => index === array.indexOf(value))
          .forEach(sf => {
            sf.fixMissingImports();
            sf.fixUnusedIdentifiers();
          });
      }

      // remove class from file
      actionClass.remove();
    });
  }

  /**
   * replaces global references to a given actionClass with createAction calls
   * @param actionClass the actionClass to update
   */
  private updateGlobalReferences(actionClass: ClassDeclaration) {
    console.log(`  updating references for ${actionClass.getName()}...`);

    // iterate over all actionClass references
    let i = 0;
    actionClass.findReferencesAsNodes().forEach(reference => {
      // exclude tests and the actions file itself
      if (
        !reference
          .getSourceFile()
          .getBaseName()
          .includes('spec.ts') &&
        reference.getSourceFile() !== this.actionsFile
      ) {
        // extract information about the reference
        const newExpression = reference.getFirstAncestor(
          ancestor => ancestor.getKind() === SyntaxKind.NewExpression
        ) as NewExpression;
        const callExpression = reference.getFirstAncestor(
          ancestor => ancestor.getKind() === SyntaxKind.CallExpression
        ) as CallExpression;

        // NewExpressions or CallExpressions
        if (newExpression) {
          console.log(`    ${newExpression.getSourceFile().getBaseName()}`);
          // swap new class instantiation to actionCreator call
          const hasArgument = newExpression.getArguments().length > 0;
          const argument = hasArgument ? `{payload: ${newExpression.getArguments()[0].getText()}}` : '';

          // update general new statements in function calls or arrow functions or arrays
          if (newExpression.getParent().getKind() === SyntaxKind.CallExpression) {
            const callExpParent = newExpression.getParentIfKindOrThrow(SyntaxKind.CallExpression);
            const argumentText = updateNewExpressionString(actionClass.getName(), argument);

            callExpParent.addArgument(argumentText);
            callExpParent.removeArgument(newExpression);
            i++;
          } else if (newExpression.getParent().getKind() === SyntaxKind.ArrowFunction) {
            const arrow = newExpression.getParentIfKindOrThrow(SyntaxKind.ArrowFunction);

            const argumentText = updateNewExpressionString(actionClass.getName(), argument);
            arrow.getFirstChildByKindOrThrow(SyntaxKind.NewExpression).replaceWithText(argumentText);
            const arrowArgStrings = arrow.getParameters().length === 0 ? '' : arrow.getParameters()[0].getText();

            // ToDo: Multiple Parameters?
            arrow.getParentIfKind(SyntaxKind.CallExpression).addArgument(`(${arrowArgStrings}) => ${argumentText}`);
            arrow.getParentIfKind(SyntaxKind.CallExpression).removeArgument(arrow);
            i++;
          } else if (newExpression.getParent().getKind() === SyntaxKind.ArrayLiteralExpression) {
            const array = newExpression.getParentIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);
            array.addElement(updateNewExpressionString(actionClass.getName(), argument));
            array.removeElement(newExpression);
            i++;
          } else if (newExpression.getParent().getKind() === SyntaxKind.ReturnStatement) {
            const returnStmt = newExpression.getParentIfKindOrThrow(SyntaxKind.ReturnStatement);
            const parentBlock = returnStmt.getParentIfKindOrThrow(SyntaxKind.Block);
            const pos = returnStmt.getPos();
            const newReturn = `return ${updateNewExpressionString(actionClass.getName(), argument)}`;
            returnStmt.remove();
            parentBlock.addStatements(newReturn);
            i++;
          }
        } else if (
          callExpression &&
          callExpression
            .getArguments()
            .filter(arg => arg.getKind() === SyntaxKind.Identifier)
            .includes(reference)
        ) {
          // update action references in call expressions
          callExpression.addArgument(actionClass.getName().replace(/^\w/, c => c.toLowerCase()));
          callExpression.removeArgument(reference);

          i++;
        }

        // ToDo: maybe update other expressions
      }
    });
    i > 0 ? console.log(`    updated ${i} reference${i > 1 ? 's' : ''}.`) : console.log('    no references found.');
  }
}
