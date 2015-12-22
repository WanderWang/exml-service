import * as fs from "fs";
import * as ts from "typescript";
import * as utils from "./utils/typescript";


var baseTypeCache:ts.Map<ts.Map<boolean>> = {};

function hasBaseTypes(theType:ts.Type,typeToFind:string,checker:ts.TypeChecker) {
    var q:string[] = [];
    var result = find(theType);
    if(result) {
        if(!baseTypeCache[typeToFind]){
            baseTypeCache[typeToFind] = {};
        }
        q.forEach(t=>baseTypeCache[typeToFind][t]=true);
    }
    return result;
    
    function find(target:ts.ObjectType):boolean{
        
        var name = checker.getFullyQualifiedName(target.getSymbol());
        q.push(name);
        if(name==typeToFind||(baseTypeCache[typeToFind]&&baseTypeCache[typeToFind][name])){
            return true;
        }
        
        var baseTypes = target.getBaseTypes().concat(utils.getImplementedInterfaces(target,checker));
        for(var t of baseTypes){
            var found = find(t);
            if(found){
                return true;
            }
        }
        q.pop();
        return false;
    }
    
}


function watch(rootFileNames: string[], options: ts.CompilerOptions) {
    const files: ts.Map<{ version: number }> = {};

    // initialize the list of files
    rootFileNames.forEach(fileName => {
        files[fileName] = { version: 0 };
    });


    // Create the language service files
    var program = ts.createProgram(rootFileNames,options);
	var sourceCodes = program.getSourceFiles();
	var checker = program.getTypeChecker();
	
	sourceCodes.forEach(source=>{
        if(source.fileName.indexOf("lib.d.ts")>=0){
            return;
        }
        if(source.fileName.indexOf("egret.d.ts")>=0){
            return;
        }
        console.log(Date.now());
		delint(source,"eui.UIComponent");
        console.log(Date.now());
	});
    
   
    checker = null;
    sourceCodes.length = 0;
    rootFileNames.length = 0;
    program = null;
    if(global.gc) global.gc();
    
    
    
	function delint(sourceFile: ts.SourceFile,base:string) {
		delintNode(sourceFile);
	
		function delintNode(node: ts.Node) {
			switch (node.kind) {
				case ts.SyntaxKind.ClassDeclaration:
                    var theType = checker.getTypeAtLocation(node);
                    
                    if(!(node.flags&ts.NodeFlags.Abstract) &&  hasBaseTypes(theType,base,checker)){
                        var className = checker.getFullyQualifiedName(checker.getTypeAtLocation(node).getSymbol());
                        var superTypes = checker.getBaseTypes(<ts.InterfaceType>theType);
                        console.log("found class: "+className);
                        
                        superTypes.forEach(t=>console.log("\t => ",checker.getFullyQualifiedName(t.getSymbol())));
                        
                        var props = theType.getSymbol().members;
                        
                        for(var name in props){
                            
                            if(name.indexOf("$")==0)
                                continue;
                            
                            var p = props[name];
                            
                            if((p.flags & ts.SymbolFlags.Property)||(p.flags & ts.SymbolFlags.Accessor)){
                                if(name=="PPP"){
                                    var aaa = name;
                                    //console.log(aaa);
                                }
                                if(p.declarations[0].flags&(ts.NodeFlags.Protected|ts.NodeFlags.Private))
                                    continue;
                                if((p.flags & ts.SymbolFlags.Accessor) && p.declarations.filter(d=>d.kind==ts.SyntaxKind.SetAccessor).length==0)
                                    continue;
                                var isPrivate = p.getDocumentationComment().some(c=>c.text.indexOf("@private")>=0);
                                if(isPrivate)
                                    continue;
                                
                                console.log(name);
                                
                                if((p.flags & ts.SymbolFlags.Property)&&p.valueDeclaration&&((<ts.VariableDeclaration>p.valueDeclaration).initializer==null)){
                                    console.log("\t",name," == null");
                                }
                                
                            }
                        }
                        
                    }
					
			}
	
			ts.forEachChild(node, delintNode);
		}
	}
}

// Initialize files constituting the program as all .ts files in the current directory
const currentDirectoryFiles = fs.readdirSync(process.cwd()).
    filter(fileName=> fileName.length >= 3 && fileName.substr(fileName.length - 3, 3) === ".ts");

console.log(Date.now());
// Start the watcher
watch([
    `E:\\Work\\exml-service\\test\\eui.d.ts`,
    `E:\\Work\\exml-service\\test\\egret.d.ts`,
    `E:\\Work\\exml-service\\test\\test.ts`
    ], { module: ts.ModuleKind.CommonJS });
    