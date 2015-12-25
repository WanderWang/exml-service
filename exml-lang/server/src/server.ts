/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, ITextDocument, Diagnostic, DiagnosticSeverity,
	InitializeParams, InitializeResult, TextDocumentIdentifier,
	CompletionItem, CompletionItemKind,TextDocumentPosition,Range
} from 'vscode-languageserver';

import * as xml from "./xml-parser";
import * as sax from "./sax";

// Create a connection for the server. The connection uses 
// stdin / stdout for message passing
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments(); 

interface DocInfo {
    tree:sax.Tag;
    lineMap:number[];
}

let parsedDocs:{ [url:string]:DocInfo } = {};

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			}
		}
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

// The settings interface describe the server relevant settings part
interface Settings {
	exml: ExmlSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface ExmlSettings {
	maxNumberOfProblems: number;
}

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	maxNumberOfProblems = settings.exml.maxNumberOfProblems || 100;
	// Revalidate any open text documents
	documents.all().forEach(validateTextDocument);
});

function validateTextDocument(textDocument: ITextDocument): void {
	let diagnostics: Diagnostic[] = [];
	let xmlString = textDocument.getText();
    var xmlDoc = xml.parse(xmlString);
    parsedDocs[textDocument.uri] = {
        tree:xmlDoc,
        lineMap:getLineMap(xmlString)
    };
    
	let problems = 0;
    var errors = xmlDoc.errors;
    
	for (var i = 0; i < errors.length && problems < maxNumberOfProblems; i++) {
		let error = errors[i];
			problems++;
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range: {
					start: { line: error.line, character: error.column},
					end: { line: error.line, character: error.column +1 }
				},
				message: error.name
			});
	}
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((change) => {
	// Monitored files have change in VSCode
	connection.console.log('We recevied an file change event');
});


// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPosition): CompletionItem[] => {
	// The pass parameter contains the position of the text document in 
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
    var doc = parsedDocs[textDocumentPosition.uri];
    var p = textDocumentPosition.position;
    var position = getPosition(doc.lineMap,p.line,p.character);
    
    var node = xml.getNodeAtPosition(doc.tree,position);
    var tag:sax.Tag;
    var attr:sax.Attribute;
    if(node.nodeType == sax.Type.Attribute){
        tag = (<sax.Attribute>node).parent;
        attr = <sax.Attribute>node;
    }
    else if(node.nodeType == sax.Type.Text||node.nodeType == sax.Type.Cdata){
        tag = (<sax.Attribute>node).parent;
    }
    else{
        tag = <sax.Tag>node;
    }
    
    var completions:CompletionItem[] = [];
    
    if(attr){
        var inAttr = position>attr.start +attr.name.length;
        if(inAttr){
            completions.push({
                label: attr.name + "123",
                kind: CompletionItemKind.Property,
                data: 1
            });
            completions.push({
                label: attr.name + "456",
                kind: CompletionItemKind.Property,
                data: 2
            });
            completions.push({
                label: attr.name + "789",
                kind: CompletionItemKind.Property,
                data: 3
            });
        }
    }
    
    if(tag && !attr) {
            completions.push({
                label: tag.name + "123",
                kind: CompletionItemKind.Property,
                data: 2
            });
            completions.push({
                label: tag.name + "456",
                kind: CompletionItemKind.Property,
                data: 3
            });
            completions.push({
                label: tag.name + "789",
                kind: CompletionItemKind.Property,
                data: 4
            });
    }
    return completions;
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data === 1) {
		item.detail = 'TypeScript details',
		item.documentation = 'TypeScript documentation'
	} else {
		item.detail = 'JavaScript details',
		item.documentation = 'JavaScript documentation'
	}
	return item;
});



/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.uri} opened.`);
});

connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});

connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.uri} closed.`);
});
*/

// Listen on the connection
connection.listen();


function getLineMap(text:string):number[]{
    if(text==null||text == undefined){
        return [0]
    };
    var lineStarts:number[] = [];
    var lines = text.split('\n');
    lines.forEach((l,i)=>{
        if(i==0)
            lineStarts[0]=0;
        else{
            lineStarts[i]=lineStarts[i-1]+lines[i-1].length+1;
        }
    })
    
    return lineStarts;
}

function getPosition(lineMap:number[],line:number,char:number){
    return lineMap[line]+char;
}