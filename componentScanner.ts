import * as fs from "fs";
import * as ts from "typescript";

function watch(rootFileNames: string[], options: ts.CompilerOptions) {
    const files: ts.Map<{ version: number }> = {};

    // initialize the list of files
    rootFileNames.forEach(fileName => {
        files[fileName] = { version: 0 };
    });

    // Create the language service host to allow the LS to communicate with the host
    const servicesHost: ts.LanguageServiceHost = {
        getScriptFileNames: () => rootFileNames,
        getScriptVersion: (fileName) => files[fileName] && files[fileName].version.toString(),
        getScriptSnapshot: (fileName) => {
            if (!fs.existsSync(fileName)) {
                return undefined;
            }

            return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
        },
        getCurrentDirectory: () => process.cwd(),
        getCompilationSettings: () => options,
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    };

    // Create the language service files
    const services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry())

	var program = services.getProgram();
	var sourceCodes = program.getSourceFiles();
	var checker = program.getTypeChecker();
	
	sourceCodes.forEach(source=>{
		delint(source);
	});
	
	function delint(sourceFile: ts.SourceFile) {
		delintNode(sourceFile);
	
		function delintNode(node: ts.Node) {
			switch (node.kind) {
				case ts.SyntaxKind.ClassDeclaration:
					if ((<ts.ClassDeclaration>node).flags & ts.NodeFlags.Export) {
						console.log("found class: "+checker.getFullyQualifiedName(checker.getTypeAtLocation(node).getSymbol()));
                        console.log("\tat: "+sourceFile.fileName);
					}
			}
	
			ts.forEachChild(node, delintNode);
		}
	}
}

// Initialize files constituting the program as all .ts files in the current directory
const currentDirectoryFiles = fs.readdirSync(process.cwd()).
    filter(fileName=> fileName.length >= 3 && fileName.substr(fileName.length - 3, 3) === ".ts");

// Start the watcher
watch(["C:\\Work\\Code\\exml-service\\test\\test.ts"], { module: ts.ModuleKind.CommonJS });