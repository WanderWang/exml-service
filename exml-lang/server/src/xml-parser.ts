import * as sax from "./sax";



export function parse(xmlString): sax.Tag {
    var strict = true, // set to false for html-mode
    saxparser = sax.parser(strict,{ position:true });
    var object:sax.Tag = null;
    var namespaces = {};
    var errors:sax.Error[] = [];
    var attribNodes:sax.Attribute[] = [];
    saxparser.resume();
    saxparser.onerror = function (err) {
        var error:sax.Error = {
            start : saxparser.startAttribPosition || saxparser.startTagPosition,
            end:saxparser.position,
            line : saxparser.line,
            column : saxparser.column,
            name:err.message,
            message:err.message
        }
        
        errors.push(error);
    };
    saxparser.onopentag = function (node: sax.Tag) {
        var attribs = node.attributes;
        node.nodeType = sax.Type.Tag;
        node.attributeNodes = attribNodes.filter(a=>a.start>saxparser.startTagPosition);
        node.attributeNodes.forEach(a=>a.parent = node);
        node.start = saxparser.startTagPosition-1;
        node.line = saxparser.line;
        node.column = saxparser.column;
        node.children = [];
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
            start : saxparser.startAttribPosition-1,
            end:saxparser.position,
            name:attr.name,
            value:attr.value,
            nodeType:sax.Type.Attribute
        };
        attribNodes.push(attrNode);
    }
    
    saxparser.onclosetag = function (node) {
        object.end = saxparser.position;
        if (object.parent)
            object = object.parent;
    };

    saxparser.oncdata = function (cdata) {
        if (object && !object.children) {
            object.nodeType =  sax.Type.Cdata;;
            object.text = cdata;
        }
    };

    saxparser.ontext = function (text) {
        if (object && !object.text && !object.children) {
            object.nodeType =  sax.Type.Text;;
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


export function getNodeAtPosition(node:sax.Tag,position:number):sax.Node {
    if(!node)
        return null;
    if(position<node.start || position>node.end)
        return null;
    if(node.nodeType!=sax.Type.Tag)
        return node;
    
    for (var index = 0; index < node.children.length; index++) {
        var element = node.children[index];
        if(index==0&&element.start > position){
            break;
        }
        var target = getNodeAtPosition(element,position);
        if(target)
            return target;
    }
    
    for (var index = 0; index < node.attributeNodes.length; index++) {
        var attr = node.attributeNodes[index];
        if(attr.start<=position&&attr.end>=position)
            return attr;
    }
    
    return node;
}