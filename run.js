
const DATABASE = {
    people: new Map(),
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
            prsn.is_partner = prsn.is_partner ? true: false;
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

    const makeNewId = ppl => {
        let new_id = crypto.randomUUID();
        while (ppl.get(new_id)) {
            new_id = crypto.randomUUID();
        };
        return new_id;
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
                let missing = ppl.get([...chldrn.keys()].find(key => ppl.get(key)?.is_missing));
                if (!missing) {
                    missing = {
                        id: makeNewId(ppl),
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
                    const items =  [
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
            if(!mouseDown) { return; }
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
        if (!qry) return;
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
        console.log()
        scrollToElement(getHighlightedPeople()[current_idx]);
        EL_COUNTER.dataset.current_person = ++current_idx;
    };

    const updateFoundCount = count => {
        EL_COUNTER.dataset.current_person = count ? 1 : 0;
        EL_COUNTER.dataset.total_people = count;
    };

    const toggleHideAll = ev => (ev.target.checked ? showAll : hideAll)();

    const showAll = () => document.querySelectorAll('.button__toggle_trunk:not(:checked)').forEach(el => el.checked = true);
    const hideAll = () => document.querySelectorAll('.button__toggle_trunk:checked').forEach(el => el.checked = false);
    const zoomPage = ev => EL_TREE.style.scale = +ev.target.value / 100;

    const scrollToElement = el => el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
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


const escapeValue = (val, is_input=false) => {
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

    const loadEditor = id => {
        const prsn = DATABASE.people.get(id);
        document.querySelector('.edit_person__id').innerHTML = `ID: ${prsn.id}`;
        document.querySelector('.edit_person__fields_wrapper').innerHTML = [
            {name: 'id', type: 'hidden'},
            {name: 'name', type: 'text', label: 'Name:'},
            {name: 'sex', type: 'radio', label: 'Sex:', options: ['M', 'F']},
            {name: 'relation_1', type: 'text', label: 'Relation 1 ID:'},
            {name: 'is_partner', type: 'checkbox', label: 'Relation 1 is partner:'},
            {name: 'relation_2', type: 'text', label: 'Relation 2 ID:'},
            {name: 'dob', type: 'date', label: 'Date of birth:'},
            {name: 'dod', type: 'date', label: 'Date of death:'},
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
        ].map(({name:fname, type='', label='', options, style=''}) => {

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
                                ${val === opt ? 'checked' :''}
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

    const save = ev => {
        ev.preventDefault();
        const prsn = DATABASE.people.get(changeLog.get('id'));
        if (!prsn) return;
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
        el_person && loadEditor(el_person.dataset.id);
    });

    EL_FORM.addEventListener('beforetoggle', ev => {
        const was_openned = ev.newState === 'open';
        document.querySelectorAll('header, main').forEach( el => el.inert = was_openned);
        was_openned && resetChanges();
    });

    EL_FORM.addEventListener('change', logChange);
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
        rebuild(
            JSON.parse(await blob.text())
        );
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

