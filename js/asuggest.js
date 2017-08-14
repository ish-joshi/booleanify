/**
 * Created by Ishan on 14/08/2017.
 */
/*
 * jQuery textarea suggest plugin
 *
 * Copyright (c) 2009-2010 Roman Imankulov
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Requires:
 *   - jQuery (tested with 1.3.x and 1.4.x)
 *   - jquery.a-tools >= 1.4.1 (http://plugins.jquery.com/project/a-tools)
 */

/*globals jQuery,document */

(function ($) {
    // workaround for Opera browser
    if (navigator.userAgent.match(/opera/i)) {
        $(document).keypress(function (e) {
            if ($.asuggestFocused) {
                $.asuggestFocused.focus();
                $.asuggestFocused = null;
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    $.asuggestKeys = {
        UNKNOWN: 0,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        DEL: 46,
        TAB: 9,
        RETURN: 13,
        ESC: 27,
        COMMA: 188,
        PAGEUP: 33,
        PAGEDOWN: 34,
        BACKSPACE: 8,
        SPACE: 32
    };
    $.asuggestFocused = null;

    $.fn.asuggest = function (suggests, options) {
        return this.each(function () {
            $.makeSuggest(this, suggests, options);
        });
    };

    $.fn.asuggest.defaults = {
        'delimiters': '\n ',
        'minChunkSize': 1,
        'cycleOnTab': true,
        'autoComplete': true,
        'endingSymbols': ' ',
        'stopSuggestionKeys': [$.asuggestKeys.RETURN, $.asuggestKeys.SPACE],
        'ignoreCase': false
    };

    /* Make suggest:
     *
     * create and return jQuery object on the top of DOM object
     * and store suggests as part of this object
     *
     * @param area: HTML DOM element to add suggests to
     * @param suggests: The array of suggest strings
     * @param options: The options object
     */
    $.makeSuggest = function (area, suggests, options) {
        options = $.extend({}, $.fn.asuggest.defaults, options);

        var KEY = $.asuggestKeys,
            $area = $(area);
        $area.suggests = suggests;
        $area.options = options;

        /* Internal method: get the chunk of text before the cursor */
        $area.getChunk = function () {
            var delimiters = this.options.delimiters.split(''), // array of chars
                textBeforeCursor = this.val().substr(0, this.getSelection().start),
                indexOfDelimiter = -1,
                i,
                d,
                idx;
            for (i = 0; i < delimiters.length; i++) {
                d = delimiters[i];
                idx = textBeforeCursor.lastIndexOf(d);
                if (idx > indexOfDelimiter) {
                    indexOfDelimiter = idx;
                }
            }
            if (indexOfDelimiter < 0) {
                return textBeforeCursor;
            } else {
                return textBeforeCursor.substr(indexOfDelimiter + 1);
            }
        };

        /* Internal method: get completion.
         * If performCycle is true then analyze getChunk() and and getSelection()
         */
        $area.getCompletion = function (performCycle) {
            var text = this.getChunk(),
                selectionText = this.getSelection().text,
                suggests = this.suggests,
                foundAlreadySelectedValue = false,
                firstMatchedValue = null,
                i,
                suggest;
            // search the variant
            for (i = 0; i < suggests.length; i++) {
                suggest = suggests[i];
                if ($area.options.ignoreCase) {
                    suggest = suggest.toLowerCase();
                    text = text.toLowerCase();
                }
                // some variant is found
                if (suggest.indexOf(text) === 0) {
                    if (performCycle) {
                        if (text + selectionText === suggest) {
                            foundAlreadySelectedValue = true;
                        } else if (foundAlreadySelectedValue) {
                            return suggest.substr(text.length);
                        } else if (firstMatchedValue === null) {
                            firstMatchedValue = suggest;
                        }
                    } else {
                        return suggest.substr(text.length);
                    }
                }
            }
            if (performCycle && firstMatchedValue) {
                return firstMatchedValue.substr(text.length);
            } else {
                return null;
            }
        };

        $area.updateSelection = function (completion) {
            if (completion) {
                var _selectionStart = $area.getSelection().start,
                    _selectionEnd = _selectionStart + completion.length;
                if ($area.getSelection().text === "") {
                    if ($area.val().length === _selectionStart) { // Weird IE workaround, I really have no idea why it works
                        $area.setCaretPos(_selectionStart + 10000);
                    }
                    $area.insertAtCaretPos(completion);
                } else {
                    $area.replaceSelection(completion);
                }
                $area.setSelection(_selectionStart, _selectionEnd);
            }
        };

        $area.unbind('keydown.asuggest').bind('keydown.asuggest', function (e) {
            if (e.keyCode === KEY.TAB) {
                if ($area.options.cycleOnTab) {
                    var chunk = $area.getChunk();
                    if (chunk.length >= $area.options.minChunkSize) {
                        $area.updateSelection($area.getCompletion(true));
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    $area.focus();
                    $.asuggestFocused = this;
                    return false;
                }
            }
            // Check for conditions to stop suggestion
            if ($area.getSelection().length &&
                $.inArray(e.keyCode, $area.options.stopSuggestionKeys) !== -1) {
                // apply suggestion. Clean up selection and insert a space
                var _selectionEnd = $area.getSelection().end +
                    $area.options.endingSymbols.length;
                var _text = $area.getSelection().text +
                    $area.options.endingSymbols;
                $area.replaceSelection(_text);
                $area.setSelection(_selectionEnd, _selectionEnd);
                e.preventDefault();
                e.stopPropagation();
                this.focus();
                $.asuggestFocused = this;
                return false;
            }
        });

        $area.unbind('keyup.asuggest').bind('keyup.asuggest', function (e) {
            var hasSpecialKeys = e.altKey || e.metaKey || e.ctrlKey,
                hasSpecialKeysOrShift = hasSpecialKeys || e.shiftKey;
            switch (e.keyCode) {
                case KEY.UNKNOWN: // Special key released
                case KEY.SHIFT:
                case KEY.CTRL:
                case KEY.ALT:
                case KEY.RETURN: // we don't want to suggest when RETURN key has pressed (another IE workaround)
                    break;
                case KEY.TAB:
                    if (!hasSpecialKeysOrShift && $area.options.cycleOnTab) {
                        break;
                    }
                case KEY.ESC:
                case KEY.BACKSPACE:
                case KEY.DEL:
                case KEY.UP:
                case KEY.DOWN:
                case KEY.LEFT:
                case KEY.RIGHT:
                    if (!hasSpecialKeysOrShift && $area.options.autoComplete) {
                        $area.replaceSelection("");
                    }
                    break;
                default:
                    if (!hasSpecialKeys && $area.options.autoComplete) {
                        var chunk = $area.getChunk();
                        if (chunk.length >= $area.options.minChunkSize) {
                            $area.updateSelection($area.getCompletion(false));
                        }
                    }
                    break;
            }
        });
        return $area;
    };
}(jQuery));











/*!
 * a-tools 1.4.1
 *
 * Copyright (c) 2009 Andrey Kramarev(andrey.kramarev[at]ampparit.com), Ampparit Inc. (www.ampparit.com)
 * Licensed under the MIT license.
 * http://www.ampparit.fi/a-tools/license.txt
 *
 * Basic usage:

 <textarea></textarea>
 <input type="text" />
 // Get current selection
 var sel = $("textarea").getSelection()

 // Replace current selection
 $("input").replaceSelection("foo");
 // Count characters
 alert($("textarea").countCharacters());
 // Set max length without callback function
 $("textarea").setMaxLength(7);
 // Set max length with callback function which will be called when limit is exceeded
 $("textarea").setMaxLength(10, function() {
 alert("hello")
 });
 // Removing limit:
 $("textarea").setMaxLength(-1);

 // Insert text at current caret position
 $("#textarea").insertAtCaretPos("hello");

 // Set caret position (1 = beginning, -1 = end)
 $("#textArea").setCaretPos(10);

 // Set Selection
 $("#textArea").setSelection(10,15);
 */
var caretPositionAmp;

jQuery.fn.extend({
    getSelection: function() {  // function for getting selection, and position of the selected text
        var input = this.jquery ? this[0] : this;
        var start;
        var end;
        var part;
        var number = 0;
        input.onmousedown = function() { // for IE because it loses caret position when focus changed
            if (document.selection && typeof(input.selectionStart) != "number") {
                document.selection.empty();
            } else {
                window.getSelection().removeAllRanges();
            }
        }
        if (document.selection) {
            // part for IE and Opera
            var s = document.selection.createRange();
            var minus = 0;
            var position = 0;
            var minusEnd = 0;
            var re;
            var rc;
            if (input.value.match(/\n/g) != null) {
                number = input.value.match(/\n/g).length;// number of EOL simbols
            }
            if (s.text) {
                part = s.text;
                // OPERA support
                if (typeof(input.selectionStart) == "number") {
                    start = input.selectionStart;
                    end = input.selectionEnd;
                    // return null if the selected text not from the needed area
                    if (start == end) {
                        return { start: start, end: end, text: s.text, length: end - start };
                    }
                } else {
                    // IE support
                    var firstRe;
                    var secondRe;
                    re = input.createTextRange();
                    rc = re.duplicate();
                    firstRe = re.text;
                    re.moveToBookmark(s.getBookmark());
                    secondRe = re.text;
                    rc.setEndPoint("EndToStart", re);
                    // return null if the selectyed text not from the needed area
                    if (firstRe == secondRe && firstRe != s.text) {
                        return this;
                    }
                    start = rc.text.length;
                    end = rc.text.length + s.text.length;
                }
                // remove all EOL to have the same start and end positons as in MOZILLA
                if (number > 0) {
                    for (var i = 0; i <= number; i++) {
                        var w = input.value.indexOf("\n", position);
                        if (w != -1 && w < start) {
                            position = w + 1;
                            minus++;
                            minusEnd = minus;
                        } else if (w != -1 && w >= start && w <= end) {
                            if (w == start + 1) {
                                minus--;
                                minusEnd--;
                                position = w + 1;
                                continue;
                            }
                            position = w + 1;
                            minusEnd++;
                        } else {
                            i = number;
                        }
                    }
                }
                if (s.text.indexOf("\n", 0) == 1) {
                    minusEnd = minusEnd + 2;
                }
                start = start - minus;
                end = end - minusEnd;

                return { start: start, end: end, text: s.text, length: end - start };
            }
            input.focus ();
            if (typeof(input.selectionStart) == "number") {
                start = input.selectionStart;
            } else {
                s = document.selection.createRange();
                re = input.createTextRange();
                rc = re.duplicate();
                re.moveToBookmark(s.getBookmark());
                rc.setEndPoint("EndToStart", re);
                start = rc.text.length;
            }
            if (number > 0) {
                for (var i = 0; i <= number; i++) {
                    var w = input.value.indexOf("\n", position);
                    if (w != -1 && w < start) {
                        position = w + 1;
                        minus++;
                    } else {
                        i = number;
                    }
                }
            }
            start = start - minus;
            return { start: start, end: start, text: s.text, length: 0 };
        } else if (typeof(input.selectionStart) == "number" ) {
            start = input.selectionStart;
            end = input.selectionEnd;
            part = input.value.substring(input.selectionStart, input.selectionEnd);
            return { start: start, end: end, text: part, length: end - start };
        } else { return { start: undefined, end: undefined, text: undefined, length: undefined }; }
    },

    // function for the replacement of the selected text
    replaceSelection: function(inputStr) {
        var input = this.jquery ? this[0] : this;
        //part for IE and Opera
        var start;
        var end;
        var position = 0;
        var rc;
        var re;
        var number = 0;
        var minus = 0;
        var mozScrollFix = ( input.scrollTop == undefined ) ? 0 : input.scrollTop;
        if (document.selection && typeof(input.selectionStart) != "number") {
            var s = document.selection.createRange();

            // IE support
            if (typeof(input.selectionStart) != "number") { // return null if the selected text not from the needed area
                var firstRe;
                var secondRe;
                re = input.createTextRange();
                rc = re.duplicate();
                firstRe = re.text;
                re.moveToBookmark(s.getBookmark());
                secondRe = re.text;
                rc.setEndPoint("EndToStart", re);
                if (firstRe == secondRe && firstRe != s.text) {
                    return this;
                }
            }
            if (s.text) {
                part = s.text;
                if (input.value.match(/\n/g) != null) {
                    number = input.value.match(/\n/g).length;// number of EOL simbols
                }
                // IE support
                start = rc.text.length;
                // remove all EOL to have the same start and end positons as in MOZILLA
                if (number > 0) {
                    for (var i = 0; i <= number; i++) {
                        var w = input.value.indexOf("\n", position);
                        if (w != -1 && w < start) {
                            position = w + 1;
                            minus++;

                        } else {
                            i = number;
                        }
                    }
                }
                s.text = inputStr;
                caretPositionAmp = rc.text.length + inputStr.length;
                re.move("character", caretPositionAmp);
                document.selection.empty();
                input.blur();
            }
            return this;
        } else if (typeof(input.selectionStart) == "number" && // MOZILLA support
            input.selectionStart != input.selectionEnd) {

            start = input.selectionStart;
            end = input.selectionEnd;
            input.value = input.value.substr(0, start) + inputStr + input.value.substr(end);
            position = start + inputStr.length;
            input.setSelectionRange(position, position);
            input.scrollTop = mozScrollFix;
            return this;
        }
        return this;
    },

    //Set Selection in text
    setSelection: function(startPosition, endPosition) {
        startPosition = parseInt(startPosition);
        endPosition = parseInt(endPosition);

        var input = this.jquery ? this[0] : this;
        input.focus ();
        if (typeof(input.selectionStart) != "number") {
            re = input.createTextRange();
            if (re.text.length < endPosition) {
                endPosition = re.text.length+1;
            }
        }
        if (endPosition < startPosition) {
            return this;
        }
        if (document.selection) {
            var number = 0;
            var plus = 0;
            var position = 0;
            var plusEnd = 0;
            if (typeof(input.selectionStart) != "number") { // IE
                re.collapse(true);
                re.moveEnd('character', endPosition);
                re.moveStart('character', startPosition);
                re.select();
                return this;
            } else if (typeof(input.selectionStart) == "number") {      // Opera
                if (input.value.match(/\n/g) != null) {
                    number = input.value.match(/\n/g).length;// number of EOL simbols
                }
                if (number > 0) {
                    for (var i = 0; i <= number; i++) {
                        var w = input.value.indexOf("\n", position);
                        if (w != -1 && w < startPosition) {
                            position = w + 1;
                            plus++;
                            plusEnd = plus;
                        } else if (w != -1 && w >= startPosition && w <= endPosition) {
                            if (w == startPosition + 1) {
                                plus--;
                                plusEnd--;
                                position = w + 1;
                                continue;
                            }
                            position = w + 1;
                            plusEnd++;
                        } else {
                            i = number;
                        }
                    }
                }
                startPosition = startPosition +plus;
                endPosition = endPosition + plusEnd;
                input.selectionStart = startPosition;
                input.selectionEnd = endPosition;
                return this;
            } else {
                return this;
            }
        }
        else if (input.selectionStart) {   // MOZILLA support
            input.focus ();
            input.selectionStart = startPosition;
            input.selectionEnd = endPosition;
            return this;
        }
    },

    // insert text at current caret position
    insertAtCaretPos: function(inputStr) {
        var input = this.jquery ? this[0] : this;
        var start;
        var end;
        var position;
        var s;
        var re;
        var rc;
        var point;
        var minus = 0;
        var number = 0;
        var mozScrollFix = ( input.scrollTop == undefined ) ? 0 : input.scrollTop;
        input.focus();
        if (document.selection && typeof(input.selectionStart) != "number") {
            if (input.value.match(/\n/g) != null) {
                number = input.value.match(/\n/g).length;// number of EOL simbols
            }
            point = parseInt(caretPositionAmp);
            if (number > 0) {
                for (var i = 0; i <= number; i++) {
                    var w = input.value.indexOf("\n", position);
                    if (w != -1 && w <= point) {
                        position = w + 1;
                        point = point - 1;
                        minus++;
                    }
                }
            }
        }
        caretPositionAmp = parseInt(caretPositionAmp);
        // IE
        input.onmouseup = function() { // for IE because it loses caret position when focus changed
            if (document.selection && typeof(input.selectionStart) != "number") {
                input.focus();
                s = document.selection.createRange();
                re = input.createTextRange();
                rc = re.duplicate();
                re.moveToBookmark(s.getBookmark());
                rc.setEndPoint("EndToStart", re);
                caretPositionAmp = rc.text.length;
            }
        }

        if (document.selection && typeof(input.selectionStart) != "number") {
            s = document.selection.createRange();
            if (s.text.length != 0) {
                return this;
            }
            re = input.createTextRange();
            textLength = re.text.length;
            rc = re.duplicate();
            re.moveToBookmark(s.getBookmark());
            rc.setEndPoint("EndToStart", re);
            start = rc.text.length;
            if (caretPositionAmp > 0 && start ==0) {
                minus = caretPositionAmp - minus;
                re.move("character", minus);
                re.select();
                s = document.selection.createRange();
                caretPositionAmp += inputStr.length;
            } else if (!(caretPositionAmp >= 0) && textLength ==0) {
                s = document.selection.createRange();
                caretPositionAmp = inputStr.length + textLength;
            } else if (!(caretPositionAmp >= 0) && start ==0) {
                re.move("character", textLength);
                re.select();
                s = document.selection.createRange();
                caretPositionAmp = inputStr.length + textLength;
            } else if (!(caretPositionAmp >= 0) && start > 0) {
                re.move("character", 0);
                document.selection.empty();
                re.select();
                s = document.selection.createRange();
                caretPositionAmp = start + inputStr.length;
            } else if (caretPositionAmp >= 0 && caretPositionAmp == textLength) {
                if (textLength != 0) {
                    re.move("character", textLength);
                    re.select();
                } else {
                    re.move("character", 0);
                }
                s = document.selection.createRange();
                caretPositionAmp = inputStr.length + textLength;
            } else if (caretPositionAmp >= 0 && start != 0 && caretPositionAmp >= start) {
                minus = caretPositionAmp - start;
                re.move("character", minus);
                document.selection.empty();
                re.select();
                s = document.selection.createRange();
                caretPositionAmp = caretPositionAmp + inputStr.length;
            } else if (caretPositionAmp >= 0 && start != 0 && caretPositionAmp < start) {
                re.move("character", 0);
                document.selection.empty();
                re.select();
                s = document.selection.createRange();
                caretPositionAmp = caretPositionAmp + inputStr.length;
            } else {
                document.selection.empty();
                re.select();
                s = document.selection.createRange();
                caretPositionAmp = caretPositionAmp + inputStr.length;
            }
            s.text = inputStr;
            input.focus();

            return this;
        } else if (typeof(input.selectionStart) == "number" && // MOZILLA support
            input.selectionStart == input.selectionEnd) {
            position = input.selectionStart + inputStr.length;
            start = input.selectionStart;
            end = input.selectionEnd;
            input.value = input.value.substr(0, start) + inputStr + input.value.substr(end);
            input.setSelectionRange(position, position);
            input.scrollTop = mozScrollFix;
            return this;
        }
        return this;
    },


    // Set caret position
    setCaretPos: function(inputStr) {

        var input = this.jquery ? this[0] : this;
        var s;
        var re;
        var position;
        var number = 0;
        var minus = 0;
        var w;
        input.focus();
        if (parseInt(inputStr) == 0) {
            return this;
        }
        //if (document.selection && typeof(input.selectionStart) == "number") {
        if (parseInt(inputStr) > 0) {
            inputStr = parseInt(inputStr) - 1;
            if (document.selection && typeof(input.selectionStart) == "number" && input.selectionStart == input.selectionEnd) {
                if (input.value.match(/\n/g) != null) {
                    number = input.value.match(/\n/g).length;// number of EOL simbols
                }
                if (number > 0) {
                    for (var i = 0; i <= number; i++) {
                        w = input.value.indexOf("\n", position);
                        if (w != -1 && w <= inputStr) {
                            position = w + 1;
                            inputStr = parseInt(inputStr) + 1;
                        }
                    }
                }
            }
        }
        else if (parseInt(inputStr) < 0) {
            inputStr = parseInt(inputStr) + 1;
            if (document.selection && typeof(input.selectionStart) != "number") {
                inputStr = input.value.length + parseInt(inputStr);
                if (input.value.match(/\n/g) != null) {
                    number = input.value.match(/\n/g).length;// number of EOL simbols
                }
                if (number > 0) {
                    for (var i = 0; i <= number; i++) {
                        w = input.value.indexOf("\n", position);
                        if (w != -1 && w <= inputStr) {
                            position = w + 1;
                            inputStr = parseInt(inputStr) - 1;
                            minus += 1;
                        }
                    }
                    inputStr = inputStr + minus - number;
                }
            } else if (document.selection && typeof(input.selectionStart) == "number") {
                inputStr = input.value.length + parseInt(inputStr);
                if (input.value.match(/\n/g) != null) {
                    number = input.value.match(/\n/g).length;// number of EOL simbols
                }
                if (number > 0) {
                    inputStr = parseInt(inputStr) - number;
                    for (var i = 0; i <= number; i++) {
                        w = input.value.indexOf("\n", position);
                        if (w != -1 && w <= (inputStr)) {
                            position = w + 1;
                            inputStr = parseInt(inputStr) + 1;
                            minus += 1;
                        }
                    }
                }
            } else { inputStr = input.value.length + parseInt(inputStr); }
        } else { return this; }
        // IE
        if (document.selection && typeof(input.selectionStart) != "number") {
            s = document.selection.createRange();
            if (s.text != 0) {
                return this;
            }
            re = input.createTextRange();
            re.collapse(true);
            re.moveEnd('character', inputStr);
            re.moveStart('character', inputStr);
            re.select();
            caretPositionAmp = inputStr;

            return this;
        } else	if (typeof(input.selectionStart) == "number" && // MOZILLA support
            input.selectionStart == input.selectionEnd) {
            input.setSelectionRange(inputStr, inputStr);
            return this;
        }
        return this;

    },

    countCharacters: function(str) {
        var input = this.jquery ? this[0] : this;
        if (input.value.match(/\r/g) != null) {
            return input.value.length - input.value.match(/\r/g).length;
        }
        return input.value.length;
    },

    setMaxLength: function(max, f) {
        this.each(function() {
            var input = this.jquery ? this[0] : this;
            var type = input.type;
            var isSelected;
            var maxCharacters;
            // remove limit if input is a negative number
            if (parseInt(max) < 0) {
                max=100000000;
            }
            if (type == "text") {
                input.maxLength = max;
            }
            if (type == "textarea" || type == "text") {
                input.onkeypress = function(e) {
                    var spacesR = input.value.match(/\r/g);
                    maxCharacters = max;
                    if (spacesR != null) {
                        maxCharacters = parseInt(maxCharacters) + spacesR.length;
                    }
                    // get event
                    var key = e || event;
                    var keyCode = key.keyCode;
                    // check if any part of text is selected
                    if (document.selection) {
                        isSelected = document.selection.createRange().text.length > 0;
                    } else {
                        isSelected = input.selectionStart != input.selectionEnd;
                    }
                    if (input.value.length >= maxCharacters && (keyCode > 47 || keyCode == 32 ||
                        keyCode == 0 || keyCode == 13) && !key.ctrlKey && !key.altKey && !isSelected) {
                        input.value = input.value.substring(0,maxCharacters);
                        if (typeof(f) == "function") { f() } //callback function
                        return false;
                    }
                }
                input.onkeyup = function() {
                    var spacesR = input.value.match(/\r/g);
                    var plus = 0;
                    var position = 0;
                    maxCharacters = max;
                    if (spacesR != null) {
                        for (var i = 0; i <= spacesR.length; i++) {
                            if (input.value.indexOf("\n", position) <= parseInt(max)) {
                                plus++;
                                position = input.value.indexOf("\n", position) + 1;
                            }
                        }
                        maxCharacters = parseInt(max) + plus;
                    }
                    if (input.value.length > maxCharacters) {
                        input.value = input.value.substring(0, maxCharacters);
                        if (typeof(f) == "function") { f() }
                        return this;
                    }
                }
            } else { return this; }
        })
        return this;
    }
});