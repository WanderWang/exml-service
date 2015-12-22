import * as sax from "sax";



export function parse(xmlString): sax.Tag {
    var strict = true, // set to false for html-mode
    saxparser = sax.parser(strict,{ position:true });
    var object:sax.Tag = null;
    var namespaces = {};
    var errors:sax.Error[] = [];
    saxparser.resume();
    saxparser.onerror = function (err) {
        var error:sax.Error = {
            position : saxparser.position,
            line : saxparser.line,
            column : saxparser.column,
            name:err.message,
            message:err.message
        }
        
        errors.push(error);
    };
    saxparser.onopentag = function (node: sax.Tag) {
        var attribs = node.attributes;
        node.nodeType = sax.TagType.Tag;
        node.attributeNodes = [];
        node.position = saxparser.position;
        node.line = saxparser.line;
        node.column = saxparser.column;
        for (var key in attribs) {
            index = key.indexOf("xmlns:");
            if (index == 0) {
                var prefix:string = key.substring(6);
                var uri = attribs[key];
                namespaces[prefix] = uri;
            }
        }
        node.toString = toString;
        var name = node.name;
        var index = name.indexOf(":");
        if (index == -1) {
            node.namespace = "";
            node.prefix = "";
            node.localName = name;
        } else {
            var prefix:string = name.substring(0, index);
            node.prefix = prefix;
            node.namespace = namespaces[prefix];
            node.localName = name.substring(index + 1);
        }
        if (object) {
            var children = object.children;
            if (!children) {
                children = object.children = [];
                if (object.text) {
                    object.text = "";
                }
            }
            children.push(node);
            node.parent = object;
            object = node;
        } else {
            object = node;
        }
    };
    
    saxparser.onattribute = function(attr) {
        var attrNode:sax.Attribute = {
            position : saxparser.position,
            line : saxparser.line,
            column : saxparser.column,
            name:attr.name,
            value:attr.value
        };
        if (object){
            object.attributeNodes.push(attrNode);
        }
    }
    
    saxparser.onclosetag = function (node) {
        if (object.parent)
            object = object.parent;
    };

    saxparser.oncdata = function (cdata) {
        if (object && !object.children) {
            object.nodeType =  sax.TagType.Cdata;;
            object.text = cdata;
        }
    };

    saxparser.ontext = function (text) {
        if (object && !object.text && !object.children) {
            object.nodeType =  sax.TagType.Text;;
            object.text = text;
        }
    };

    saxparser.write(xmlString).close();
    object.errors = errors;
    return object;
    
};

function toString() {
    return this.text;
};

