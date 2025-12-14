
const DATABASE = {
    people: new Map(),
};


const makeNewId = () => {
    let new_id = crypto.randomUUID();
    while (DATABASE.people.get(new_id)) {
        new_id = crypto.randomUUID();
    };
    return new_id;
};


const rebuild = (() => {

    const buildMap = (tree, ppl) => {
        let prsn;
        for (let i = 0; i < tree.length; i++) {
            prsn = tree[i];
            ppl.has(prsn.id) && console.error(
                'Duplicate id',
                prsn,
            );
            prsn.relations = new Map();
            ppl.set(prsn.id, prsn);
        };
    };

    const checkFields = (data, ppl) => {

        const err = (txt, prsn) => console.error(txt, prsn);

        const checkRelation1 = prsn => {
            if (!prsn.relation_1) return;
            !ppl.has(prsn.relation_1)
                && err(
                    'Incorrect relation_1',
                    prsn,
                );
        };

        const checkRelation2 = prsn => {
            if (!prsn.relation_2) return;
            !ppl.has(prsn.relation_2)
                && err(
                    'Incorrect relation_2',
                    prsn,
                );
        };

        const checkIsPartner = prsn => {
            prsn.is_partner = prsn.is_partner ? true : false;
        };

        const VALID_SEX_VALUES = ['M', 'F'];
        const checkSex = prsn => {
            !VALID_SEX_VALUES.includes(prsn.sex) && err(
                'INVALID SEX',
                prsn,
            );
        };

        const checkDOB = prsn => {
            if (!prsn.dob) return;
            (prsn.dob.length !== 10) && err(
                'Invalid dob',
                prsn,
            );
            prsn.dob.split('-').some(v => !+v) && err(
                'Invalid dob',
                prsn,
            );
        };

        const checkDOD = prsn => {
            if (!prsn.dod) return;
            (prsn.dod.length !== 10) && err(
                'Invalid dod',
                prsn,
            );
            prsn.dod.split('-').some(v => !+v) && err(
                'Invalid dod',
                prsn,
            );
        };

        let prsn;
        for (let i = 0; i < data.length; i++) {
            prsn = data[i];
            checkRelation1(prsn);
            checkRelation2(prsn);
            checkIsPartner(prsn);
            checkSex(prsn);
            checkDOB(prsn);
            checkDOD(prsn);
        };
    };

    const buildTree = (tree, ppl) => {
        const len = tree.length
        let skip = -1;
        for (let i = len - 1; i >= skip; i--) {
            const prsn = tree.pop();
            const r1 = ppl.get(prsn.relation_1);

            if (!r1) {
                ++skip;
                tree.unshift(prsn);
                continue;
            };

            const chldrn = r1.relations;

            if (prsn.is_partner) {
                if (chldrn.has(prsn.id)) continue;
                chldrn.set(prsn.id, []);
                continue;
            };

            if (!prsn.relation_2) {
                let missing = ppl.get(
                    [...chldrn.keys()]
                        .find(key => ppl.get(key)?.is_missing)
                );
                if (!missing) {
                    missing = {
                        id: makeNewId(),
                        is_missing: true,
                        relation_1: r1.id,
                        is_partner: true,
                        sex: r1.sex === 'M' ? 'F' : 'M',
                    };
                    ppl.set(missing.id, missing);
                };
                prsn.relation_2 = missing.id;
            };

            const r2_id = prsn.relation_2;
            if (!chldrn.has(r2_id)) {
                chldrn.set(r2_id, [])
            };
            chldrn.get(r2_id).unshift(prsn);
        };
    };

    const renderTree = (tree, ppl) => {

        const renderPerson = prsn => {

            const name = `<b>${prsn.is_missing ? '' : escapeValue(prsn.name)}</b>`;

            const toggle_trunk = prsn.relations?.size
                ? `
                    <label
                        style='
                            display: flex;
                            text-align: center;
                            '
                    >
                        <input type='checkbox' class='button__toggle_trunk' checked>
                    </label>
                `
                : '';

            const img_count = prsn.images?.length;
            const img = img_count
                ? `
                    <div class='person__image_wrapper'>
                        <img
                            src='${prsn.images[prsn.images.length - 1]}'
                            class='person__image'>
                        </img>
                        ${(img_count > 1)
                    ? `<div class='person__image_count'>${img_count}</div>`
                    : ''
                }
                    </div>
                    `
                : '';
            const dts = (prsn.dob || prsn.dod)
                ? `
                    <small
                        style='text-wrap: nowrap;'
                    >
                        ${prsn.dob || '?'}${prsn.dod ? ` &rarr; ${prsn.dod}` : ''}
                    </small>`
                : '';

            return `
            <button
                class='person ${prsn.sex === 'M' ? '--male' : '--female'}'
                data-id='${prsn.id}'
                popovertarget='id_form_edit_person'
            >
                ${name}
                ${toggle_trunk}
                ${img}
                ${dts}
            </button>`;
        };

        const renderPartner = prsn => {
            return `
                <div class='partner'>
                    ${renderPerson(prsn)}
                </div>
                `;
        };

        const renderBranch = prsn => {

            const grps = prsn.relations.size
                ? [...prsn.relations].map(([prtnr_id, rels]) => {
                    const items = [
                        renderPartner(ppl.get(prtnr_id)),
                        rels.length
                            ? `
                            <div class='children'>
                                ${rels.map(renderBranch).join('')}
                            </div>
                            `
                            : '',
                    ].join('')
                    return `
                    <div class='relation_group'>
                        ${items}
                    </div>`
                }).join('')
                : '';

            return `
            <div class='trunk'>
                ${renderPerson(prsn)}
                ${grps
                    ? `<div class='relation_groups'>${grps}</div>`
                    : ''
                }
            </div>`;

        };

        document.getElementById('id_tree').innerHTML = tree.map(renderBranch).join('');
    };

    return tree => {
        const ppl = DATABASE.people;
        ppl.clear();
        buildMap(tree, ppl);
        checkFields(tree, ppl);
        tree.sort((a, b) => {
            return (a.dob > b.dob) ? 1 : -1
        });
        buildTree(tree, ppl);
        renderTree(tree, ppl);
        changeView.searchPerson();
    };

})();


const changeView = (() => {

    const CLSS_HIGHLIGHT = '--highlight';
    const EL_TREE = document.getElementById('id_tree');
    const EL_SEARCH = document.getElementById('id_search');
    const EL_COUNTER = document.getElementById('id_data_search_count');
    const EL_SHOW_ALL_TOGGLE = document.getElementById('id_input_show_all');

    (() => {
        let mouseDown = false;
        let startX, startY, scrollLeft, scrollTop;
        const slider = document.querySelector('main');

        const startDragging = ev => {
            mouseDown = true;
            startX = ev.pageX - slider.offsetLeft;
            startY = ev.pageY - slider.offsetTop;
            scrollLeft = slider.scrollLeft;
            scrollTop = slider.scrollTop;
        };

        const stopDragging = () => {
            mouseDown = false;
        };

        const move = ev => {
            ev.preventDefault();
            if (!mouseDown) { return; }
            const x = ev.pageX - slider.offsetLeft;
            const y = ev.pageY - slider.offsetTop;
            const scrollX = x - startX;
            const scrollY = y - startY;
            slider.scrollLeft = scrollLeft - scrollX;
            slider.scrollTop = scrollTop - scrollY;
        };

        // Add the event listeners
        slider.addEventListener('mousemove', move, false);
        slider.addEventListener('mousedown', startDragging, false);
        slider.addEventListener('mouseup', stopDragging, false);
        slider.addEventListener('mouseleave', stopDragging, false);
    })();

    const getHighlightedPeople = () => document.querySelectorAll(`.${CLSS_HIGHLIGHT}`);

    const searchPerson = () => {
        getHighlightedPeople().forEach(el => el.classList.remove(CLSS_HIGHLIGHT));
        const str = EL_SEARCH.value.toLowerCase();
        const ppl = DATABASE.people;
        if (!str) {
            updateFoundCount(ppl.size);
            return showAll();
        };
        const found = [];
        ppl.forEach(obj => obj.name?.toLowerCase().includes(str) && found.push(obj.id));
        const qry = found.map(id => `[data-id='${id}']`).join(',');
        if (!qry) return updateFoundCount(0);
        EL_SHOW_ALL_TOGGLE.checked = false;
        hideAll();
        const els = EL_TREE.querySelectorAll(qry);
        els.forEach(el => {
            el.classList.add(CLSS_HIGHLIGHT);
            while (el !== EL_TREE) {
                if (el.classList.contains('trunk')) {
                    const checkbox = el.querySelector(':scope > .person .button__toggle_trunk');
                    checkbox && (checkbox.checked = true);
                };
                el = el.parentNode;
            };
        });
        updateFoundCount(els.length);
        scrollToElement(els[0]);
    };

    const jumpToNextFound = () => {
        const max = +EL_COUNTER.dataset.total_people;
        let current_idx = +EL_COUNTER.dataset.current_person;
        (current_idx >= max) && (current_idx = 0);
        scrollToElement(getHighlightedPeople()[current_idx]);
        EL_COUNTER.dataset.current_person = ++current_idx;
    };

    const updateFoundCount = count => {
        EL_COUNTER.dataset.current_person = count ? 1 : 0;
        EL_COUNTER.dataset.total_people = count;
    };

    const toggleHideAll = ev => (ev.target.checked ? showAll : hideAll)();

    const getSubTree = (els, qry) => els.length
        ? [...els].map(el => [...el.parentElement.querySelectorAll(qry)]).flat()
        : document.querySelectorAll(qry);

    const showAll = () => {
        const els = getHighlightedPeople();
        getSubTree(els, '.button__toggle_trunk:not(:checked)').forEach(el => el.checked = true);
        scrollToCurrentHighlighted(els);
    };
    const hideAll = () => {
        const els = getHighlightedPeople();
        getSubTree(els, '.button__toggle_trunk:checked').forEach(el => el.checked = false);
        scrollToCurrentHighlighted(els);
    };
    const zoomPage = ev => EL_TREE.style.scale = +ev.target.value / 100;

    const scrollToCurrentHighlighted = els => scrollToElement(
        els[+EL_COUNTER.dataset.current_person - 1],
        {
            behavior: 'instant',
        }
    );

    const scrollToElement = (el, props = {}) => el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
        ...props,
    });

    EL_SEARCH.addEventListener('input', searchPerson);
    EL_COUNTER.addEventListener('click', jumpToNextFound);
    EL_SHOW_ALL_TOGGLE.addEventListener('input', toggleHideAll);
    document.getElementById('id_input_zoom').addEventListener('input', zoomPage);

    return {
        searchPerson,
        updateFoundCount,
    };

})();


const escapeValue = (val, is_input = false) => {
    if (
        (val === null)
        || (val === undefined)
    ) return '';
    // replaces ', " and < to make is safe to insert into HTML
    const initial = val
        .toString()
        .replace(/'/g, "&#39;")
        .replace(/"/g, '&quot;');
    return is_input ? initial : initial.replace(/</g, `&lt`);
};


const changeData = (() => {

    const EL_FORM = document.getElementById('id_form_edit_person');

    const changeLog = new Map();

    const makeImageElement = src => `
        <div tabindex=0 class='edit_person__image_wrapper'>
            <img src='${src}' class='edit_person__image'></img>
            <button class='edit_person__delete_image def_button'>Delete</button>
        </div>
        `;

    const loadEditor = prsn => {
        document.querySelector('.edit_person__id').innerHTML = `ID: ${prsn.id}`;
        document.querySelector('.edit_person__fields_wrapper').innerHTML = [
            { name: 'id', type: 'hidden' },
            { name: 'name', type: 'text', label: 'Name:' },
            { name: 'sex', type: 'radio', label: 'Sex:', options: ['M', 'F'] },
            { name: 'relation_1', type: 'text', label: 'Relation 1 ID:' },
            { name: 'is_partner', type: 'checkbox', label: 'Relation 1 is partner:' },
            { name: 'relation_2', type: 'text', label: 'Relation 2 ID:' },
            { name: 'dob', type: 'date', label: 'Date of birth:' },
            { name: 'dod', type: 'date', label: 'Date of death:' },
            {
                name: 'info',
                type: 'textarea',
                label: 'Information:',
                style: `
                    width: 100%;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: .5rem;
                    `,
            },
        ].map(({ name: fname, type = '', label = '', options, style = '' }) => {

            const val = prsn[fname];
            const escp_val = escapeValue(val, true);

            let input;
            if (type === 'textarea') {
                input = `
                    <textarea
                        name='${fname}'
                        rows='5'
                        style='width: 100%;'
                    >${escp_val}</textarea>`;
            } else if (type === 'radio') {
                input = options.map(
                    opt => `
                        <label class='radio_option'>
                            ${opt}
                            <input
                                type='radio'
                                name='${fname}'
                                value="${escapeValue(opt, true)}"
                                ${val === opt ? 'checked' : ''}
                            >
                        </label>`
                ).join('');
            } else {
                input = `
                    <input
                        type='${type}'
                        name='${fname}'
                        value="${escp_val}"
                    >`;
            };

            return `
                <label
                    class='${type === 'hidden' ? '--hide' : 'edit_person__field'}'
                    style='${style}'
                    ${val ? `data-display_value="${escp_val}"` : ''}
                >
                    ${label}
                    ${input}
                </label>
                `;
        }).join('');

        document.querySelector('.edit_person__images').innerHTML = (prsn.images || []).map(makeImageElement).join('')

    };

    const resetChanges = () => changeLog.clear();

    const getFormData = () => Object.fromEntries(new FormData(
        document.getElementById('id_form_edit_person')
    ));

    const logChange = ev => {
        const field_name = ev.target.name;
        const fields = getFormData();
        changeLog.set('id', fields.id);
        changeLog.set(field_name, fields[field_name]);
    };

    const addRelation = ev => {
        resetChanges();
        const relation_1 = getFormData().id;
        changeLog.set('relation_1', relation_1);
        relation_1 && loadEditor({
            id: makeNewId(),
            relation_1,
        });
    };

    const save = ev => {
        ev.preventDefault();
        const id = changeLog.get('id');
        if (!id) return;
        let prsn = DATABASE.people.get(id);
        if (!prsn) {
            DATABASE.people.set(id, { id });
            prsn = DATABASE.people.get(id);
        };
        prsn.is_missing = false;
        changeLog.delete('id');
        changeLog.forEach((val, field) => prsn[field] = val);
        rebuild([...DATABASE.people.values()]);
        resetChanges();
    };

    const modifyStoredImages = func => {
        const prsn = DATABASE.people.get(getFormData().id);
        if (!prsn) return;
        changeLog.set('id', prsn.id);
        const imgs = (
            changeLog.get('images')
            || (
                prsn.images
                && [...prsn.images]
            )
            || []
        );
        func(imgs);
        changeLog.set('images', imgs);
    };

    const addImage = ev => {
        const file = ev.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const src = reader.result;
            modifyStoredImages(imgs => imgs.push(src));
            document.querySelector('.edit_person__images').insertAdjacentHTML(
                'beforeend',
                makeImageElement(src),
            );
        };
        reader.readAsDataURL(file);
    };

    const deleteImage = ev => {
        if (!ev.target.closest('.edit_person__delete_image')) return;
        const elToRemove = ev.target.closest('.edit_person__image_wrapper');
        const delInd = [
            ...ev.target.closest('.edit_person__images').querySelectorAll('.edit_person__image_wrapper')
        ].indexOf(elToRemove);
        if (delInd < 0) return;
        modifyStoredImages(imgs => imgs.splice(delInd, 1));
        elToRemove.remove();
    };

    document.getElementById('id_tree').addEventListener('click', ev => {
        const el_person = ev.target.closest('.person');
        el_person && loadEditor(DATABASE.people.get(el_person.dataset.id));
    });

    EL_FORM.addEventListener('beforetoggle', ev => {
        const was_openned = ev.newState === 'open';
        document.querySelectorAll('header, main').forEach(el => el.inert = was_openned);
        was_openned && resetChanges();
    });

    EL_FORM.addEventListener('change', logChange);
    document.getElementById('id_button_add_relation').addEventListener('click', addRelation);
    document.getElementById('id_button_edit_person_save').addEventListener('click', save);
    document.getElementById('id_input_add_image').addEventListener('input', addImage);
    document.querySelector('.edit_person__images').addEventListener('click', deleteImage);
    document.getElementById('id_button_edit_person_close').addEventListener('click', () => EL_FORM.hidePopover());

})();


const importExport = (() => {

    const importFile = async ev => {
        document.getElementById('id_tree').innerHTML = 'Loading please wait...';
        const file = ev.target.files[0];
        const split_file_name = file.name.split('.');
        let blob = file;
        if (split_file_name[split_file_name.length - 1] === 'gz') {
            const decompressionStream = new DecompressionStream('gzip');
            const decompressedStream = file.stream().pipeThrough(decompressionStream);
            blob = await new Response(decompressedStream).blob();
        };
        rebuild(JSON.parse(await blob.text()));
        ev.target.value = '';
    };

    const exportFile = async () => {

        const jsonString = JSON.stringify(
            [...DATABASE.people.values()]
                .filter(obj => !obj.is_missing)
                .map(obj => {
                    if (DATABASE.people.get(obj.relation_1)?.is_missing) {
                        obj.relation_1 = '';
                    };
                    if (DATABASE.people.get(obj.relation_2)?.is_missing) {
                        obj.relation_2 = '';
                    };
                    delete obj.relations;
                    return obj;
                })
        )

        const blob = new Blob([jsonString], {
            type: 'application/json',
        });
        const compressionStream = new CompressionStream('gzip');
        const compressedReadableStream = blob.stream().pipeThrough(compressionStream);
        const compressedResponse = await new Response(compressedReadableStream);
        const compressedBlob = await compressedResponse.blob();

        const el = window.document.createElement("a");
        el.href = window.URL.createObjectURL(compressedBlob);
        el.download = `tree-${new Date().getTime()}.gz`;
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    };

    document.getElementById('id_input_upload_date').addEventListener('input', importFile);
    document.getElementById('id_button_export').addEventListener('click', exportFile);

})();








/*
    PinchZoom.js
    https://github.com/manuelstofer/pinchzoom
    Copyright (c) Manuel Stofer 2013 - today

    Author: Manuel Stofer (mst@rtp.ch)
    Version: 2.3.5

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

*/

// polyfills
// if (typeof Object.assign != 'function') {
//     // Must be writable: true, enumerable: false, configurable: true
//     Object.defineProperty(Object, "assign", {
//         value: function assign(target, varArgs) { // .length of function is 2
//             if (target == null) { // TypeError if undefined or null
//                 throw new TypeError('Cannot convert undefined or null to object');
//             }

//             var to = Object(target);

//             for (var index = 1; index < arguments.length; index++) {
//                 var nextSource = arguments[index];

//                 if (nextSource != null) { // Skip over if undefined or null
//                     for (var nextKey in nextSource) {
//                         // Avoid bugs when hasOwnProperty is shadowed
//                         if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
//                             to[nextKey] = nextSource[nextKey];
//                         }
//                     }
//                 }
//             }
//             return to;
//         },
//         writable: true,
//         configurable: true
//     });
// }

// if (typeof Array.from != 'function') {
//     Array.from = function (object) {
//         return [].slice.call(object);
//     };
// }

// utils
const buildElement = function (str) {
    // empty string as title argument required by IE and Edge
    var tmp = document.implementation.createHTMLDocument('');
    tmp.body.innerHTML = str;
    return Array.from(tmp.body.children)[0];
};

const triggerEvent = function (el, name) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(name, true, false);
    el.dispatchEvent(event);
};

const PinchZoom = (() => {

    /**
     * Pinch zoom
     * @param el
     * @param options
     * @constructor
     */
    var PinchZoom = function (el, options) {
        this.el = el;
        this.zoomFactor = 1;
        this.lastScale = 1;
        this.offset = {
            x: 0,
            y: 0
        };
        this.initialOffset = {
            x: 0,
            y: 0,
        };
        this.options = Object.assign({}, this.defaults, options);
        this.setupMarkup();
        this.bindEvents();
        this.update();

        // The image may already be loaded when PinchZoom is initialized,
        // and then the load event (which trigger update) will never fire.
        if (this.isImageLoaded(this.el)) {
            this.updateAspectRatio();
            this.setupOffsets();
        }

        this.enable();

    },
        sum = function (a, b) {
            return a + b;
        },
        isCloseTo = function (value, expected) {
            return value > expected - 0.01 && value < expected + 0.01;
        };

    PinchZoom.prototype = {

        defaults: {
            tapZoomFactor: 2,
            zoomOutFactor: 1.3,
            animationDuration: 300,
            maxZoom: 4,
            minZoom: 0.5,
            draggableUnzoomed: true,
            lockDragAxis: false,
            setOffsetsOnce: false,
            use2d: true,
            useMouseWheel: false,
            useDoubleTap: true,
            zoomStartEventName: 'pz_zoomstart',
            zoomUpdateEventName: 'pz_zoomupdate',
            zoomEndEventName: 'pz_zoomend',
            dragStartEventName: 'pz_dragstart',
            dragUpdateEventName: 'pz_dragupdate',
            dragEndEventName: 'pz_dragend',
            doubleTapEventName: 'pz_doubletap',
            mouseWheelEventName: 'pz_mousewheel',
            verticalPadding: 0,
            horizontalPadding: 0,
            onZoomStart: null,
            onZoomEnd: null,
            onZoomUpdate: null,
            onDragStart: null,
            onDragEnd: null,
            onDragUpdate: null,
            onDoubleTap: null,
            onMouseWheel: null
        },

        /**
         * Event handler for 'dragstart'
         * @param event
         */
        handleDragStart: function (event) {
            triggerEvent(this.el, this.options.dragStartEventName);
            if (typeof this.options.onDragStart == "function") {
                this.options.onDragStart(this, event)
            }
            this.stopAnimation();
            this.lastDragPosition = false;
            this.hasInteraction = true;
            this.handleDrag(event);
        },

        /**
         * Event handler for 'drag'
         * @param event
         */
        handleDrag: function (event) {
            var touch = event.type === "touchmove" ? this.getTouches(event)[0] : this.getPointer(event);
            this.drag(touch, this.lastDragPosition);
            this.offset = this.sanitizeOffset(this.offset);
            this.lastDragPosition = touch;
        },

        handleDragEnd: function () {
            triggerEvent(this.el, this.options.dragEndEventName);
            if (typeof this.options.onDragEnd == "function") {
                this.options.onDragEnd(this, event)
            }
            this.end();
        },

        /**
         * Event handler for 'zoomstart'
         * @param event
         */
        handleZoomStart: function (event) {
            triggerEvent(this.el, this.options.zoomStartEventName);
            if (typeof this.options.onZoomStart == "function") {
                this.options.onZoomStart(this, event)
            }
            this.stopAnimation();
            this.lastScale = 1;
            this.nthZoom = 0;
            this.lastZoomCenter = false;
            this.hasInteraction = true;
        },

        /**
         * Event handler for 'zoom'
         * @param event
         */
        handleZoom: function (event, newScale) {
            // a relative scale factor is used
            var touchCenter = this.getTouchCenter(this.getTouches(event)),
                scale = newScale / this.lastScale;
            this.lastScale = newScale;

            // the first touch events are thrown away since they are not precise
            this.nthZoom += 1;
            if (this.nthZoom > 3) {

                this.scale(scale, touchCenter);
                this.drag(touchCenter, this.lastZoomCenter);
            }
            this.lastZoomCenter = touchCenter;
        },

        handleZoomEnd: function () {
            triggerEvent(this.el, this.options.zoomEndEventName);
            if (typeof this.options.onZoomEnd == "function") {
                this.options.onZoomEnd(this, event)
            }
            this.end();
        },

        /**
         * Event handler for 'doubletap'
         * @param event
         */
        handleDoubleTap: function (event) {
            var center = this.getTouches(event)[0],
                zoomFactor = this.zoomFactor > 1 ? 1 : this.options.tapZoomFactor,
                startZoomFactor = this.zoomFactor,
                updateProgress = (function (progress) {
                    this.scaleTo(startZoomFactor + progress * (zoomFactor - startZoomFactor), center);
                }).bind(this);

            if (this.hasInteraction) {
                return;
            }

            this.isDoubleTap = true;

            if (startZoomFactor > zoomFactor) {
                center = this.getCurrentZoomCenter();
            }

            this.animate(this.options.animationDuration, updateProgress, this.swing);
            triggerEvent(this.el, this.options.doubleTapEventName);
            if (typeof this.options.onDoubleTap == "function") {
                this.options.onDoubleTap(this, event)
            }
        },

        /**
         * Event handler for 'mousewheel'
         * @param event
         */
        handleMouseWheel: function (event) {
            var center = this.getPointer(event),
                newScale = Math.min(
                    Math.max(this.options.minZoom, this.lastScale + event.deltaY * -0.01),
                    this.options.maxZoom
                ),
                scale = newScale / this.lastScale;

            this.scale(scale, center);

            this.lastScale = newScale;
            this.update()

            triggerEvent(this.el, this.options.mouseWheelEventName);
            if (typeof this.options.onMouseWheel == "function") {
                this.options.onMouseWheel(this, event);
            }
        },

        /**
         * Compute the initial offset
         *
         * the element should be centered in the container upon initialization
         */
        computeInitialOffset: function () {
            this.initialOffset = {
                x: -Math.abs(this.el.offsetWidth * this.getInitialZoomFactor() - this.container.offsetWidth) / 2,
                y: -Math.abs(this.el.offsetHeight * this.getInitialZoomFactor() - this.container.offsetHeight) / 2,
            };
        },

        /**
         * Reset current image offset to that of the initial offset
         */
        resetOffset: function () {
            this.offset.x = this.initialOffset.x;
            this.offset.y = this.initialOffset.y;
        },

        /**
         * Determine if image is loaded
         */
        isImageLoaded: function (el) {
            if (el.nodeName === 'IMG') {
                return el.complete && el.naturalHeight !== 0;
            } else {
                return Array.from(el.querySelectorAll('img')).every(this.isImageLoaded);
            }
        },

        setupOffsets: function () {
            if (this.options.setOffsetsOnce && this._isOffsetsSet) {
                return;
            }

            this._isOffsetsSet = true;

            this.computeInitialOffset();
            this.resetOffset();
        },

        /**
         * Max / min values for the offset
         * @param offset
         * @return {Object} the sanitized offset
         */
        sanitizeOffset: function (offset) {
            var elWidth = this.el.offsetWidth * this.getInitialZoomFactor() * this.zoomFactor;
            var elHeight = this.el.offsetHeight * this.getInitialZoomFactor() * this.zoomFactor;
            var maxX = elWidth - this.getContainerX() + this.options.horizontalPadding,
                maxY = elHeight - this.getContainerY() + this.options.verticalPadding,
                maxOffsetX = Math.max(maxX, 0),
                maxOffsetY = Math.max(maxY, 0),
                minOffsetX = Math.min(maxX, 0) - this.options.horizontalPadding,
                minOffsetY = Math.min(maxY, 0) - this.options.verticalPadding;

            return {
                x: Math.min(Math.max(offset.x, minOffsetX), maxOffsetX),
                y: Math.min(Math.max(offset.y, minOffsetY), maxOffsetY)
            };
        },

        /**
         * Scale to a specific zoom factor (not relative)
         * @param zoomFactor
         * @param center
         */
        scaleTo: function (zoomFactor, center) {
            this.scale(zoomFactor / this.zoomFactor, center);
        },

        /**
         * Scales the element from specified center
         * @param scale
         * @param center
         */
        scale: function (scale, center) {
            scale = this.scaleZoomFactor(scale);
            this.addOffset({
                x: (scale - 1) * (center.x + this.offset.x),
                y: (scale - 1) * (center.y + this.offset.y)
            });
            triggerEvent(this.el, this.options.zoomUpdateEventName);
            if (typeof this.options.onZoomUpdate == "function") {
                this.options.onZoomUpdate(this, event)
            }
        },

        /**
         * Scales the zoom factor relative to current state
         * @param scale
         * @return the actual scale (can differ because of max min zoom factor)
         */
        scaleZoomFactor: function (scale) {
            var originalZoomFactor = this.zoomFactor;
            this.zoomFactor *= scale;
            this.zoomFactor = Math.min(this.options.maxZoom, Math.max(this.zoomFactor, this.options.minZoom));
            return this.zoomFactor / originalZoomFactor;
        },

        /**
         * Determine if the image is in a draggable state
         *
         * When the image can be dragged, the drag event is acted upon and cancelled.
         * When not draggable, the drag event bubbles through this component.
         *
         * @return {Boolean}
         */
        canDrag: function () {
            return this.options.draggableUnzoomed || !isCloseTo(this.zoomFactor, 1);
        },

        /**
         * Drags the element
         * @param center
         * @param lastCenter
         */
        drag: function (center, lastCenter) {
            if (lastCenter) {
                if (this.options.lockDragAxis) {
                    // lock scroll to position that was changed the most
                    if (Math.abs(center.x - lastCenter.x) > Math.abs(center.y - lastCenter.y)) {
                        this.addOffset({
                            x: -(center.x - lastCenter.x),
                            y: 0
                        });
                    }
                    else {
                        this.addOffset({
                            y: -(center.y - lastCenter.y),
                            x: 0
                        });
                    }
                }
                else {
                    this.addOffset({
                        y: -(center.y - lastCenter.y),
                        x: -(center.x - lastCenter.x)
                    });
                }
                triggerEvent(this.el, this.options.dragUpdateEventName);
                if (typeof this.options.onDragUpdate == "function") {
                    this.options.onDragUpdate(this, event)
                }
            }
        },

        /**
         * Calculates the touch center of multiple touches
         * @param touches
         * @return {Object}
         */
        getTouchCenter: function (touches) {
            return this.getVectorAvg(touches);
        },

        /**
         * Calculates the average of multiple vectors (x, y values)
         */
        getVectorAvg: function (vectors) {
            return {
                x: vectors.map(function (v) { return v.x; }).reduce(sum) / vectors.length,
                y: vectors.map(function (v) { return v.y; }).reduce(sum) / vectors.length
            };
        },

        /**
         * Adds an offset
         * @param offset the offset to add
         * @return return true when the offset change was accepted
         */
        addOffset: function (offset) {
            this.offset = {
                x: this.offset.x + offset.x,
                y: this.offset.y + offset.y
            };
        },

        sanitize: function () {
            if (this.zoomFactor < this.options.zoomOutFactor) {
                this.zoomOutAnimation();
            } else if (this.isInsaneOffset(this.offset)) {
                this.sanitizeOffsetAnimation();
            }
        },

        /**
         * Checks if the offset is ok with the current zoom factor
         * @param offset
         * @return {Boolean}
         */
        isInsaneOffset: function (offset) {
            var sanitizedOffset = this.sanitizeOffset(offset);
            return sanitizedOffset.x !== offset.x ||
                sanitizedOffset.y !== offset.y;
        },

        /**
         * Creates an animation moving to a sane offset
         */
        sanitizeOffsetAnimation: function () {
            var targetOffset = this.sanitizeOffset(this.offset),
                startOffset = {
                    x: this.offset.x,
                    y: this.offset.y
                },
                updateProgress = (function (progress) {
                    this.offset.x = startOffset.x + progress * (targetOffset.x - startOffset.x);
                    this.offset.y = startOffset.y + progress * (targetOffset.y - startOffset.y);
                    this.update();
                }).bind(this);

            this.animate(
                this.options.animationDuration,
                updateProgress,
                this.swing
            );
        },

        /**
         * Zooms back to the original position,
         * (no offset and zoom factor 1)
         */
        zoomOutAnimation: function () {
            if (this.zoomFactor === 1) {
                return;
            }

            var startZoomFactor = this.zoomFactor,
                zoomFactor = 1,
                center = this.getCurrentZoomCenter(),
                updateProgress = (function (progress) {
                    this.scaleTo(startZoomFactor + progress * (zoomFactor - startZoomFactor), center);
                }).bind(this);

            this.animate(
                this.options.animationDuration,
                updateProgress,
                this.swing
            );
        },

        /**
         * Updates the container aspect ratio
         *
         * Any previous container height must be cleared before re-measuring the
         * parent height, since it depends implicitly on the height of any of its children
         */
        updateAspectRatio: function () {
            this.unsetContainerY();
            this.setContainerY(this.container.parentElement.offsetHeight);
        },

        /**
         * Calculates the initial zoom factor (for the element to fit into the container)
         * @return {number} the initial zoom factor
         */
        getInitialZoomFactor: function () {
            var xZoomFactor = this.container.offsetWidth / this.el.offsetWidth;
            var yZoomFactor = this.container.offsetHeight / this.el.offsetHeight;

            return Math.min(xZoomFactor, yZoomFactor);
        },

        /**
         * Calculates the aspect ratio of the element
         * @return the aspect ratio
         */
        getAspectRatio: function () {
            return this.el.offsetWidth / this.el.offsetHeight;
        },

        /**
         * Calculates the virtual zoom center for the current offset and zoom factor
         * (used for reverse zoom)
         * @return {Object} the current zoom center
         */
        getCurrentZoomCenter: function () {
            var offsetLeft = this.offset.x - this.initialOffset.x;
            var centerX = -1 * this.offset.x - offsetLeft / (1 / this.zoomFactor - 1);

            var offsetTop = this.offset.y - this.initialOffset.y;
            var centerY = -1 * this.offset.y - offsetTop / (1 / this.zoomFactor - 1);

            return {
                x: centerX,
                y: centerY
            };
        },

        /**
         * Returns the touches of an event relative to the container offset
         * @param event
         * @return array touches
         */
        getTouches: function (event) {
            var rect = this.container.getBoundingClientRect();
            var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
            var posTop = rect.top + scrollTop;
            var posLeft = rect.left + scrollLeft;

            return Array.prototype.slice.call(event.touches).map(function (touch) {
                return {
                    x: touch.pageX - posLeft,
                    y: touch.pageY - posTop,
                };
            });
        },

        /**
         * Returns the pointer of an event relative to the container offset
         * @param event
         * @return pointer
         */
        getPointer: function (event) {
            var rect = this.container.getBoundingClientRect();
            var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
            var posTop = rect.top + scrollTop;
            var posLeft = rect.left + scrollLeft;

            return {
                x: event.pageX - posLeft,
                y: event.pageY - posTop,
            };
        },

        /**
         * Animation loop
         * does not support simultaneous animations
         * @param duration
         * @param framefn
         * @param timefn
         * @param callback
         */
        animate: function (duration, framefn, timefn, callback) {
            var startTime = new Date().getTime(),
                renderFrame = (function () {
                    if (!this.inAnimation) { return; }
                    var frameTime = new Date().getTime() - startTime,
                        progress = frameTime / duration;
                    if (frameTime >= duration) {
                        framefn(1);
                        if (callback) {
                            callback();
                        }
                        this.update();
                        this.stopAnimation();
                        this.update();
                    } else {
                        if (timefn) {
                            progress = timefn(progress);
                        }
                        framefn(progress);
                        this.update();
                        requestAnimationFrame(renderFrame);
                    }
                }).bind(this);
            this.inAnimation = true;
            requestAnimationFrame(renderFrame);
        },

        /**
         * Stops the animation
         */
        stopAnimation: function () {
            this.inAnimation = false;
        },

        /**
         * Swing timing function for animations
         * @param p
         * @return {Number}
         */
        swing: function (p) {
            return -Math.cos(p * Math.PI) / 2 + 0.5;
        },

        getContainerX: function () {
            return this.container.offsetWidth;
        },

        getContainerY: function () {
            return this.container.offsetHeight;
        },

        setContainerY: function (y) {
            return this.container.style.height = y + 'px';
        },

        unsetContainerY: function () {
            this.container.style.height = null;
        },

        /**
         * Creates the expected html structure
         */
        setupMarkup: function () {
            this.container = buildElement('<div class="pinch-zoom-container"></div>');
            this.el.parentNode.insertBefore(this.container, this.el);
            this.container.appendChild(this.el);

            this.container.style.overflow = 'hidden';
            this.container.style.position = 'relative';

            this.el.style.webkitTransformOrigin = '0% 0%';
            this.el.style.mozTransformOrigin = '0% 0%';
            this.el.style.msTransformOrigin = '0% 0%';
            this.el.style.oTransformOrigin = '0% 0%';
            this.el.style.transformOrigin = '0% 0%';

            this.el.style.position = 'absolute';
            this.el.style.backfaceVisibility = 'hidden';
            this.el.style.willChange = 'transform';
        },

        end: function () {
            this.hasInteraction = false;
            this.sanitize();
            this.update();
        },

        /**
         * Binds all required event listeners
         */
        bindEvents: function () {
            var self = this;
            detectGestures(this.container, this);

            this.resizeHandler = this.update.bind(this)
            window.addEventListener('resize', this.resizeHandler);
            Array.from(this.el.querySelectorAll('img')).forEach(function (imgEl) {
                imgEl.addEventListener('load', self.update.bind(self));
            });

            if (this.el.nodeName === 'IMG') {
                this.el.addEventListener('load', this.update.bind(this));
            }
        },

        /**
         * Updates the css values according to the current zoom factor and offset
         */
        update: function (event) {
            if (event && event.type === 'resize') {
                this.updateAspectRatio();
                this.setupOffsets();
            }

            if (event && event.type === 'load') {
                this.updateAspectRatio();
                this.setupOffsets();
            }

            if (this.updatePlanned) {
                return;
            }
            this.updatePlanned = true;

            window.setTimeout((function () {
                this.updatePlanned = false;

                var zoomFactor = this.getInitialZoomFactor() * this.zoomFactor,
                    offsetX = -this.offset.x / zoomFactor,
                    offsetY = -this.offset.y / zoomFactor,
                    transform3d = 'scale3d(' + zoomFactor + ', ' + zoomFactor + ',1) ' +
                        'translate3d(' + offsetX + 'px,' + offsetY + 'px,0px)',
                    transform2d = 'scale(' + zoomFactor + ', ' + zoomFactor + ') ' +
                        'translate(' + offsetX + 'px,' + offsetY + 'px)',
                    removeClone = (function () {
                        if (this.clone) {
                            this.clone.parentNode.removeChild(this.clone);
                            delete this.clone;
                        }
                    }).bind(this);

                // Scale 3d and translate3d are faster (at least on ios)
                // but they also reduce the quality.
                // PinchZoom uses the 3d transformations during interactions
                // after interactions it falls back to 2d transformations
                if (!this.options.use2d || this.hasInteraction || this.inAnimation) {
                    this.is3d = true;
                    removeClone();

                    this.el.style.webkitTransform = transform3d;
                    this.el.style.mozTransform = transform2d;
                    this.el.style.msTransform = transform2d;
                    this.el.style.oTransform = transform2d;
                    this.el.style.transform = transform3d;
                } else {
                    // When changing from 3d to 2d transform webkit has some glitches.
                    // To avoid this, a copy of the 3d transformed element is displayed in the
                    // foreground while the element is converted from 3d to 2d transform
                    if (this.is3d) {
                        this.clone = this.el.cloneNode(true);
                        this.clone.style.pointerEvents = 'none';
                        this.container.appendChild(this.clone);
                        window.setTimeout(removeClone, 200);
                    }

                    this.el.style.webkitTransform = transform2d;
                    this.el.style.mozTransform = transform2d;
                    this.el.style.msTransform = transform2d;
                    this.el.style.oTransform = transform2d;
                    this.el.style.transform = transform2d;

                    this.is3d = false;
                }
            }).bind(this), 0);
        },

        /**
         * Enables event handling for gestures
         */
        enable: function () {
            this.enabled = true;
        },

        /**
         * Disables event handling for gestures
         */
        disable: function () {
            this.enabled = false;
        },

        /**
         * Unmounts the zooming container and global event listeners
         */
        destroy: function () {
            window.removeEventListener('resize', this.resizeHandler);

            if (this.container) {
                this.container.remove();
                this.container = null;
            }
        }

    };

    var detectGestures = function (el, target) {
        var interaction = null,
            fingers = 0,
            lastTouchStart = null,
            startTouches = null,

            setInteraction = function (newInteraction, event) {
                if (interaction !== newInteraction) {

                    if (interaction && !newInteraction) {
                        switch (interaction) {
                            case "zoom":
                                target.handleZoomEnd(event);
                                break;
                            case 'drag':
                                target.handleDragEnd(event);
                                break;
                        }
                    }

                    switch (newInteraction) {
                        case 'zoom':
                            target.handleZoomStart(event);
                            break;
                        case 'drag':
                            target.handleDragStart(event);
                            break;
                    }
                }
                interaction = newInteraction;
            },

            updateInteraction = function (event) {
                if (fingers === 2) {
                    setInteraction('zoom');
                } else if (fingers === 1 && target.canDrag()) {
                    setInteraction('drag', event);
                } else {
                    setInteraction(null, event);
                }
            },

            targetTouches = function (touches) {
                return Array.from(touches).map(function (touch) {
                    return {
                        x: touch.pageX,
                        y: touch.pageY
                    };
                });
            },

            getDistance = function (a, b) {
                var x, y;
                x = a.x - b.x;
                y = a.y - b.y;
                return Math.sqrt(x * x + y * y);
            },

            calculateScale = function (startTouches, endTouches) {
                var startDistance = getDistance(startTouches[0], startTouches[1]),
                    endDistance = getDistance(endTouches[0], endTouches[1]);
                return endDistance / startDistance;
            },

            cancelEvent = function (event) {
                event.stopPropagation();
                event.preventDefault();
            },

            detectDoubleTap = function (event) {
                var time = (new Date()).getTime();

                if (fingers > 1) {
                    lastTouchStart = null;
                }

                if (time - lastTouchStart < 300) {
                    cancelEvent(event);

                    target.handleDoubleTap(event);
                    switch (interaction) {
                        case "zoom":
                            target.handleZoomEnd(event);
                            break;
                        case 'drag':
                            target.handleDragEnd(event);
                            break;
                    }
                } else {
                    target.isDoubleTap = false;
                }

                if (fingers === 1) {
                    lastTouchStart = time;
                }
            },
            firstMove = true;

        el.addEventListener('touchstart', function (event) {
            if (target.enabled) {
                firstMove = true;
                fingers = event.touches.length;

                if (target.options.useDoubleTap) {
                    detectDoubleTap(event);
                }
            }
        }, { passive: false });

        el.addEventListener('touchmove', function (event) {
            if (target.enabled && !target.isDoubleTap) {
                if (firstMove) {
                    updateInteraction(event);
                    if (interaction) {
                        cancelEvent(event);
                    }
                    startTouches = targetTouches(event.touches);
                } else {
                    switch (interaction) {
                        case 'zoom':
                            if (startTouches.length == 2 && event.touches.length == 2) {
                                target.handleZoom(event, calculateScale(startTouches, targetTouches(event.touches)));
                            }
                            break;
                        case 'drag':
                            target.handleDrag(event);
                            break;
                    }
                    if (interaction) {
                        cancelEvent(event);
                        target.update();
                    }
                }

                firstMove = false;
            }
        }, { passive: false });

        el.addEventListener('touchend', function (event) {
            if (target.enabled) {
                fingers = event.touches.length;
                updateInteraction(event);
            }
        });

        if (target.options.useMouseWheel) {

            el.addEventListener("mousewheel", function (event) {
                if (target.enabled) {
                    cancelEvent(event);
                    target.handleMouseWheel(event);
                }
            });

            el.addEventListener("mousedown", function (event) {
                if (target.enabled) {
                    firstMove = true;
                    fingers = 1;
                }
            }, { passive: true });

            el.addEventListener('mousemove', function (event) {
                if (target.enabled) {
                    if (firstMove) {
                        updateInteraction(event);
                        if (interaction) {
                            cancelEvent(event);
                        }
                    } else {
                        if (interaction === "drag") {
                            target.handleDrag(event);
                        }
                        if (interaction) {
                            cancelEvent(event);
                            target.update();
                        }
                    }
                    firstMove = false;
                }
            }, { passive: false });

            el.addEventListener("mouseup", function (event) {
                if (target.enabled) {
                    fingers = 0;
                    updateInteraction(event);
                }
            }, { passive: true });
        }
    };

    return PinchZoom;
})();

new PinchZoom(document.getElementById('id_tree', {
    minZoom: 1,
    onZoomStart: (obj, ev) => {
        console.log({ obj, ev });
    },
    onZoomEnd: (obj, ev) => {
        console.log({ obj, ev });
    },
}));