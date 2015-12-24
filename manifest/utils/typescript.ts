import * as ts from "typescript";

export function getClassExtendsHeritageClauseElement(node: ts.ClassLikeDeclaration) {
    let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
    return heritageClause && heritageClause.types.length > 0 ? heritageClause.types[0] : undefined;
}

export function getClassImplementsHeritageClauseElements(node: ts.ClassLikeDeclaration) {
    let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ImplementsKeyword);
    return heritageClause ? heritageClause.types : undefined;
}

export function getInterfaceBaseTypeNodes(node: ts.InterfaceDeclaration) {
    let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
    return heritageClause ? heritageClause.types : undefined;
}

export function getHeritageClause(clauses: ts.NodeArray<ts.HeritageClause>, kind: ts.SyntaxKind) {
    if (clauses) {
        for (let clause of clauses) {
            if (clause.token === kind) {
                return clause;
            }
        }
    }

    return undefined;
}

export function getImplementedInterfaces(type: ts.Type,checker:ts.TypeChecker) {
    var superInterfaces: Array<any> = null;
    var result :Array<ts.ObjectType> = [];
    
    
    if (type.symbol.declarations) {
        type.symbol.declarations.forEach(node=> {
    
            var interfaceType = checker.getTypeAtLocation(node)
            var isClass = interfaceType.flags & ts.TypeFlags.Class;
            if (isClass)
                superInterfaces = getClassImplementsHeritageClauseElements(<ts.ClassLikeDeclaration>node);
            else
                superInterfaces = getInterfaceBaseTypeNodes(<ts.InterfaceDeclaration>node);
            if (superInterfaces) {
                superInterfaces.forEach(sp=> {
                    interfaceType = checker.getTypeAtLocation(sp);
                    if (interfaceType.flags & ts.TypeFlags.Interface) {
                        result.push(interfaceType);
                    }
                });
            }
        });
    }
    return result;
}