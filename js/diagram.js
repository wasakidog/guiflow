var listeners = {};
var emitter = {
    on: function(name, callback) { (listeners[name] || (listeners[name] = [])).push(callback); },
    emit: function(name, value) { (listeners[name] || []).forEach(function(callback) { callback(value); }); }
};
var CURRENT_DOC;
var svgElement = function() {
    return $("#diagram-1 svg");
};
var getViewBox = function(svg) {
    return svg[0].getAttribute("viewBox").split(/\s/g).map(parseFloat);
};


var VIEW_BOX_VALUES;
var SCALE = 1.0;
var DEFAULT_VIEW_BOX = "";
var setViewBox = function(svg, values) {
    var text = values.join(" ");
    svg[0].setAttribute("viewBox", text);
    $("#viewBox").text(values.map(function(value) { return value.toFixed(2); }).join(","));
    VIEW_BOX_VALUES = values;
};

$(function() {
    $("#plus").on("click", function() {
        var svg = svgElement();
        if (!svg.length) return;
        var viewBoxValues = getViewBox(svg);
        viewBoxValues[2] /= 1.2;
        viewBoxValues[3] /= 1.2;
        setViewBox(svg, viewBoxValues);
    });

    $("#flat").on("click", function() {
        var svg = svgElement();
        if (!svg.length || !DEFAULT_VIEW_BOX) return;
        setViewBox(svg, DEFAULT_VIEW_BOX);
    });

    $("#minus").on("click", function() {
        var svg = svgElement();
        if (!svg.length) return;
        var viewBoxValues = getViewBox(svg);
        viewBoxValues[2] *= 1.2;
        viewBoxValues[3] *= 1.2;
        setViewBox(svg, viewBoxValues);
    });

});

var refresh = function(data) {
    var meta = data.meta;
    var doc = data.svg;
    CURRENT_DOC = doc;
    var parsed = new DOMParser().parseFromString(doc, 'image/svg+xml');
    parsed.querySelectorAll('script, foreignObject').forEach(function(node) { node.remove(); });
    parsed.querySelectorAll('*').forEach(function(node) {
        Array.from(node.attributes).forEach(function(attr) {
            if (/^on/i.test(attr.name) || /href$/i.test(attr.name)) node.removeAttribute(attr.name);
        });
    });
    $("#diagram-1").empty().append(document.importNode(parsed.documentElement, true));
    var svg = svgElement();
    if (!svg.length) throw new Error('Invalid diagram SVG');

    var metaData = JSON.parse(meta);
    DEFAULT_VIEW_BOX = getViewBox(svg);
    if (VIEW_BOX_VALUES)
        setViewBox(svg, VIEW_BOX_VALUES);
    var startX, startY;
    var initialViewBox;
    var onDrag = false;

    svg.find("g.node polygon").attr("fill", "white");
    svg.find("g.node ellipse").attr("fill", "white");
    svg.find("g.node").on("mouseover", function(e) {
        $(this).find("polygon").attr("stroke", "green");
        $(this).find("polygon").attr("stroke-width", "4");
        $(this).find("ellipse").attr("stroke", "red");
        $(this).find("ellipse").attr("stroke-width", "4");
    });
    svg.find("g.node").on("click", function(e) {
        var text = $(this).find("title").text().trim();
        if ($(this).find("ellipse").length === 0) {
            if (!metaData[text]) return;
            var lines = metaData[text].lines;
            emitter.emit("page-click", lines);
        } else {
            var insertText = ["\n[", text, "]\n"].join("");
            emitter.emit("end-click", insertText);
        }
    });
    svg.find("g.node").on("mouseout", function(e) {
        $(this).find("polygon").attr("stroke", "black");
        $(this).find("polygon").attr("stroke-width", "1");
        $(this).find("ellipse").attr("stroke", "black");
        $(this).find("ellipse").attr("stroke-width", "1");
    });
    svg.on("mousedown", function(evt) {
        startX = evt.clientX;
        startY = evt.clientY;
        initialViewBox = getViewBox(svg);
        onDrag = true;
        evt.preventDefault();
        return false;
    });
    svg.on("mousemove", function(evt) {
        if (onDrag) {
            var movingX = evt.clientX;
            var movingY = evt.clientY;
            var diffX = movingX - startX;
            var diffY = movingY - startY;
            var viewBoxValues = getViewBox(svg);
            viewBoxValues[0] = initialViewBox[0] - diffX * SCALE;
            viewBoxValues[1] = initialViewBox[1] - diffY * SCALE;
            setViewBox(svg, viewBoxValues);
        }
        evt.preventDefault();
        return false;
    });
    svg.on("mouseup", function(evt) {
        onDrag = false;
        evt.preventDefault();
        return false;
    });
};

window.guiflowDiagram = {
    refresh: refresh,
    on: function(channel, cb) {
        emitter.on(channel, cb);
    }
};
