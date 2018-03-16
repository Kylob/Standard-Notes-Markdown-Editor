;"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ComponentManager = function () {
  function ComponentManager(permissions, onReady) {
    _classCallCheck(this, ComponentManager);

    this.sentMessages = [];
    this.messageQueue = [];
    this.initialPermissions = permissions;
    this.loggingEnabled = false;
    this.acceptsThemes = true;
    this.onReadyCallback = onReady;

    this.coallesedSaving = true;
    this.coallesedSavingDelay = 250;

    window.addEventListener("message", function (event) {
      if (this.loggingEnabled) {
        console.log("Components API Message received:", event.data);
      }
      this.handleMessage(event.data);
    }.bind(this), false);
  }

  _createClass(ComponentManager, [{
    key: "handleMessage",
    value: function handleMessage(payload) {
      if (payload.action === "component-registered") {
        this.sessionKey = payload.sessionKey;
        this.componentData = payload.componentData;
        this.onReady(payload.data);

        if (this.loggingEnabled) {
          console.log("Component successfully registered with payload:", payload);
        }
      } else if (payload.action === "themes") {
        if (this.acceptsThemes) {
          this.activateThemes(payload.data.themes);
        }
      } else if (payload.original) {
        // get callback from queue
        var originalMessage = this.sentMessages.filter(function (message) {
          return message.messageId === payload.original.messageId;
        })[0];

        if (originalMessage.callback) {
          originalMessage.callback(payload.data);
        }
      }
    }
  }, {
    key: "onReady",
    value: function onReady(data) {
      if (this.initialPermissions && this.initialPermissions.length > 0) {
        this.requestPermissions(this.initialPermissions);
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.messageQueue[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var message = _step.value;

          this.postMessage(message.action, message.data, message.callback);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.messageQueue = [];
      this.environment = data.environment;
      this.uuid = data.uuid;

      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    }
  }, {
    key: "getSelfComponentUUID",
    value: function getSelfComponentUUID() {
      return this.uuid;
    }
  }, {
    key: "isRunningInDesktopApplication",
    value: function isRunningInDesktopApplication() {
      return this.environment === "desktop";
    }
  }, {
    key: "setComponentDataValueForKey",
    value: function setComponentDataValueForKey(key, value) {
      this.componentData[key] = value;
      this.postMessage("set-component-data", { componentData: this.componentData }, function (data) {});
    }
  }, {
    key: "clearComponentData",
    value: function clearComponentData() {
      this.componentData = {};
      this.postMessage("set-component-data", { componentData: this.componentData }, function (data) {});
    }
  }, {
    key: "componentDataValueForKey",
    value: function componentDataValueForKey(key) {
      return this.componentData[key];
    }
  }, {
    key: "postMessage",
    value: function postMessage(action, data, callback) {
      if (!this.sessionKey) {
        this.messageQueue.push({
          action: action,
          data: data,
          callback: callback
        });
        return;
      }

      var message = {
        action: action,
        data: data,
        messageId: this.generateUUID(),
        sessionKey: this.sessionKey,
        api: "component"
      };

      var sentMessage = JSON.parse(JSON.stringify(message));
      sentMessage.callback = callback;
      this.sentMessages.push(sentMessage);

      if (this.loggingEnabled) {
        console.log("Posting message:", message);
      }

      window.parent.postMessage(message, '*');
    }
  }, {
    key: "setSize",
    value: function setSize(type, width, height) {
      this.postMessage("set-size", { type: type, width: width, height: height }, function (data) {});
    }
  }, {
    key: "requestPermissions",
    value: function requestPermissions(permissions, callback) {
      this.postMessage("request-permissions", { permissions: permissions }, function (data) {
        callback && callback();
      }.bind(this));
    }
  }, {
    key: "streamItems",
    value: function streamItems(contentTypes, callback) {
      if (!Array.isArray(contentTypes)) {
        contentTypes = [contentTypes];
      }
      this.postMessage("stream-items", { content_types: contentTypes }, function (data) {
        callback(data.items);
      }.bind(this));
    }
  }, {
    key: "streamContextItem",
    value: function streamContextItem(callback) {
      this.postMessage("stream-context-item", null, function (data) {
        var item = data.item;
        /*
          When an item is saved via saveItem, its updated_at value is set client side to the current date.
          If we make a change locally, then for whatever reason receive an item via streamItems/streamContextItem,
          we want to ignore that change if it was made prior to the latest change we've made.
           Update 1/22/18: However, if a user is restoring a note from version history, this change
          will not pass through this filter and will thus be ignored. Because the client now handles
          this case with isMetadataUpdate, we no longer need the below.
        */
        // if(this.streamedContextItem && this.streamedContextItem.uuid == item.uuid
        //   && this.streamedContextItem.updated_at > item.updated_at) {
        //   return;
        // }
        // this.streamedContextItem = item;
        callback(item);
      });
    }
  }, {
    key: "selectItem",
    value: function selectItem(item) {
      this.postMessage("select-item", { item: this.jsonObjectForItem(item) });
    }
  }, {
    key: "createItem",
    value: function createItem(item, callback) {
      this.postMessage("create-item", { item: this.jsonObjectForItem(item) }, function (data) {
        var item = data.item;
        this.associateItem(item);
        callback && callback(item);
      }.bind(this));
    }
  }, {
    key: "associateItem",
    value: function associateItem(item) {
      this.postMessage("associate-item", { item: this.jsonObjectForItem(item) });
    }
  }, {
    key: "deassociateItem",
    value: function deassociateItem(item) {
      this.postMessage("deassociate-item", { item: this.jsonObjectForItem(item) });
    }
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.postMessage("clear-selection", { content_type: "Tag" });
    }
  }, {
    key: "deleteItem",
    value: function deleteItem(item) {
      this.deleteItems([item]);
    }
  }, {
    key: "deleteItems",
    value: function deleteItems(items) {
      var params = {
        items: items.map(function (item) {
          return this.jsonObjectForItem(item);
        }.bind(this))
      };
      this.postMessage("delete-items", params);
    }
  }, {
    key: "sendCustomEvent",
    value: function sendCustomEvent(action, data, callback) {
      this.postMessage(action, data, function (data) {
        callback && callback(data);
      }.bind(this));
    }
  }, {
    key: "saveItem",
    value: function saveItem(item, callback) {
      this.saveItems([item], callback);
    }
  }, {
    key: "saveItems",
    value: function saveItems(items, callback) {
      var _this = this;

      items = items.map(function (item) {
        item.updated_at = new Date();
        return this.jsonObjectForItem(item);
      }.bind(this));

      var saveBlock = function saveBlock() {
        _this.postMessage("save-items", { items: items }, function (data) {
          callback && callback();
        });
      };

      /*
          Coallesed saving prevents saves from being made after every keystroke, and instead
          waits coallesedSavingDelay before performing action. For example, if a user types a keystroke, and the clienet calls saveItem,
          a 250ms delay will begin. If they type another keystroke within 250ms, the previously pending
          save will be cancelled, and another 250ms delay occurs. If ater 250ms the pending delay is not cleared by a future call,
          the save will finally trigger.
           Note: it's important to modify saving items updated_at immediately and not after delay. If you modify after delay,
          a delayed sync could just be wrapping up, and will send back old data and replace what the user has typed.
      */
      if (this.coallesedSaving == true) {
        if (this.pendingSave) {
          clearTimeout(this.pendingSave);
        }

        this.pendingSave = setTimeout(function () {
          saveBlock();
        }, this.coallesedSavingDelay);
      }
    }
  }, {
    key: "jsonObjectForItem",
    value: function jsonObjectForItem(item) {
      var copy = Object.assign({}, item);
      copy.children = null;
      copy.parent = null;
      return copy;
    }

    /* Themes */

  }, {
    key: "activateThemes",
    value: function activateThemes(urls) {
      this.deactivateAllCustomThemes();

      if (this.loggingEnabled) {
        console.log("Activating themes:", urls);
      }

      if (!urls) {
        return;
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = urls[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var url = _step2.value;

          if (!url) {
            continue;
          }

          var link = document.createElement("link");
          link.href = url;
          link.type = "text/css";
          link.rel = "stylesheet";
          link.media = "screen,print";
          link.className = "custom-theme";
          document.getElementsByTagName("head")[0].appendChild(link);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  }, {
    key: "deactivateAllCustomThemes",
    value: function deactivateAllCustomThemes() {
      var elements = document.getElementsByClassName("custom-theme");

      [].forEach.call(elements, function (element) {
        if (element) {
          element.disabled = true;
          element.parentNode.removeChild(element);
        }
      });
    }

    /* Utilities */

  }, {
    key: "generateUUID",
    value: function generateUUID() {
      var crypto = window.crypto || window.msCrypto;
      if (crypto) {
        var buf = new Uint32Array(4);
        crypto.getRandomValues(buf);
        var idx = -1;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          idx++;
          var r = buf[idx >> 3] >> idx % 8 * 4 & 15;
          var v = c == 'x' ? r : r & 0x3 | 0x8;
          return v.toString(16);
        });
      } else {
        var d = new Date().getTime();
        if (window.performance && typeof window.performance.now === "function") {
          d += performance.now(); //use high-precision timer if available
        }
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
        });
        return uuid;
      }
    }
  }]);

  return ComponentManager;
}();

if (typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = ComponentManager;
}

if (window) {
  window.ComponentManager = ComponentManager;
}
//# sourceMappingURL=dist.js.map
;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

document.addEventListener("DOMContentLoaded", function (event) {

  var workingNote;

  var permissions = [{
    name: "stream-context-item"
  }];

  var componentManager = new ComponentManager(permissions, function () {
    // on ready
  });

  var ignoreTextChange = false;
  var initialLoad = true;
  var lastValue, lastUUID;

  componentManager.streamContextItem(function (note) {

    if (note.uuid !== lastUUID) {
      // Note changed, reset last values
      lastValue = null;
      initialLoad = true;
      lastUUID = note.uuid;
    }

    workingNote = note;

    // Only update UI on non-metadata updates.
    if (note.isMetadataUpdate || !window.simplemde) {
      return;
    }

    if (note.content.text !== lastValue) {
      ignoreTextChange = true;
      window.simplemde.value(note.content.text);
      ignoreTextChange = false;
    }

    if (initialLoad) {
      initialLoad = false;
      window.simplemde.codemirror.getDoc().clearHistory();
      if (window.simplemde.isPreviewActive()) {
        window.simplemde.togglePreview(); /* clear previous */
      }
      window.simplemde.togglePreview(); /* preview on startup */
    }
  });

  window.simplemde = new SimpleMDE({
	blockStyles: {
		bold: "__",
		italic: "_"
	},
    element: document.getElementById("editor"),
	insertTexts: {
		image: ["![](", ")"],
		link: ["[", "]()"],
		table: ["", "\n\n| One | Two | Three |\n| --- | --- | --- |\n| Uno | Dos | Trés |\n\n"],
	},
	renderingConfig: {
		codeSyntaxHighlighting: true,
	},
	shortcuts: {
		"togglePreview": "Ctrl-Alt-P", /*  Preview HTML */
		"toggleSideBySide": "Ctrl-Alt-S", /*  Split Screen */
		"toggleHeadingSmaller": "Ctrl-Alt-H", /*  Headers */
		"toggleBold": "Ctrl-Alt-B", /*  Bold */
		"toggleItalic": "Ctrl-Alt-I", /*  Italicize */
		"toggleBlockquote": "Ctrl-Alt-Q", /*  Quote */
		"toggleUnorderedList": "Ctrl-Alt-L", /*  List */
		"toggleCodeBlock": "Ctrl-Alt-C", /*  Code */
		"drawTable": "Ctrl-Alt-T", /*  Table */
		"drawImage": "Ctrl-Alt-M", /*  iMage [sic] */
		"drawLink": "Ctrl-Alt-U" /*  URL Link */
	},
    spellChecker: false,
    status: false,
    toolbar: ["preview", "side-by-side", "|", "heading", "bold", "italic", "|", "quote", "unordered-list", "code", "|", "table", "image", "link"]
  });

  window.simplemde.toggleFullScreen();

  simplemde.codemirror.on("change", function () {
    if (!ignoreTextChange) {
      lastValue = simplemde.value();
      if (workingNote) {
        workingNote.content.text = lastValue;
        componentManager.saveItem(workingNote);
      }
    }
  });
});


},{}]},{},[1]);
