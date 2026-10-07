/* @ds-bundle: {"format":4,"namespace":"NCRT","components":[{"name":"Button"},{"name":"TextField"},{"name":"Panel"},{"name":"SectionHeader"},{"name":"CourseItem"}]} */
(function () {
  var React = window.React, h = React.createElement;
  var ARROW_DOWN = "M19.8,34.2c-0.3,0-0.3-0.1-0.4-0.1L6.6,21.4c-0.1-0.1-0.1-0.1-0.1-0.4c0-0.3,0.1-0.3,0.1-0.4l1.5-1.5 C8.2,19.1,8.2,19,8.5,19s0.3,0.1,0.4,0.1l9.2,9.2V5.9c0-0.1,0-0.2,0-0.2c0,0,0,0,0,0c0.1-0.1,0.2-0.1,0.4-0.1H21 c0.2,0,0.4,0.1,0.5,0.1c0,0,0,0.1,0,0.2v22.4l9.2-9.2c0.1-0.1,0.1-0.1,0.4-0.1c0.3,0,0.3,0.1,0.4,0.1l1.5,1.5 c0.1,0.1,0.1,0.1,0.1,0.4c0,0.3-0.1,0.3-0.1,0.4L20.2,34.1C20.1,34.1,20.1,34.2,19.8,34.2z";
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function omit(o, keys) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && keys.indexOf(k) < 0) r[k] = o[k]; return r; }

  function ArrowDown() {
    return h("svg", { className: "ncrt-icon", viewBox: "0 0 40 40", "aria-hidden": "true", focusable: "false" }, h("path", { d: ARROW_DOWN }));
  }

  /** Outline call to action. href renders a link (scroll targets like #contact), otherwise a button. */
  function Button(props) {
    var rest = omit(props, ["icon", "className", "children", "href", "type"]);
    var kids = [h("span", { key: "l", className: "ncrt-btn-label" }, props.children), props.icon === "arrow-down" ? h(ArrowDown, { key: "i" }) : null];
    var cls = cx("ncrt-btn", props.className);
    if (props.href) return h("a", Object.assign({ href: props.href, role: "button" }, rest, { className: cls }), kids);
    return h("button", Object.assign({ type: props.type || "button" }, rest, { className: cls }), kids);
  }

  var uid = 0;
  /** Labelled input or textarea. Label optional: the site's own form relies on placeholders. */
  function TextField(props) {
    var idRef = React.useRef(null);
    if (!idRef.current) idRef.current = props.id || "ncrt-field-" + (++uid);
    var id = idRef.current;
    var rest = omit(props, ["label", "multiline", "className", "id"]);
    var control = h(props.multiline ? "textarea" : "input", Object.assign({ id: id, type: props.multiline ? undefined : (props.type || "text") }, rest, { className: "ncrt-input" }));
    return h("div", { className: cx("ncrt-field", props.className) },
      props.label ? h("label", { htmlFor: id, className: "ncrt-field-label" }, props.label) : null,
      control);
  }

  /** Section ground. frosted = panel fill + grain + blur; clear = transparent. photo adds the scrimmed background photograph. */
  function Panel(props) {
    var variant = props.variant || "frosted";
    var style = Object.assign({}, props.style || {});
    if (props.photo) style["--ncrt-photo"] = "url(" + JSON.stringify(props.photo) + ")";
    var rest = omit(props, ["variant", "photo", "padded", "className", "children", "style", "as"]);
    return h(props.as || "section", Object.assign({}, rest, {
      className: cx(props.photo ? "ncrt-backdrop" : null, "ncrt-panel", "ncrt-panel-" + variant, props.padded === false ? null : "ncrt-panel-pad", props.className),
      style: style
    }), props.children);
  }

  /** Eyebrow kicker over a Dela Gothic title. Wrap words in <mark> inside eyebrow to colour them signal. */
  function SectionHeader(props) {
    var level = props.level || 2;
    return h("header", { className: cx("ncrt-section-header", props.className) },
      props.eyebrow ? h("p", { className: "ncrt-eyebrow" }, props.eyebrow) : null,
      h("h" + level, { className: cx("ncrt-title", props.size === "section" ? "ncrt-title-section" : "ncrt-title-tier") }, props.title));
  }

  /** A course name (Inter 900) over its description (Inter 0.75rem). */
  function CourseItem(props) {
    var level = props.level || 3;
    return h("div", { className: cx("ncrt-course", props.className) },
      h("h" + level, { className: "ncrt-course-name" }, props.name),
      props.children ? h("p", { className: "ncrt-course-desc" }, props.children) : null);
  }

  window.NCRT = Object.assign(window.NCRT || {}, { Button: Button, TextField: TextField, Panel: Panel, SectionHeader: SectionHeader, CourseItem: CourseItem });
})();
