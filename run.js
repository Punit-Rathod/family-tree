
const ALL_PEOPLE = new Map();


const rebuild = (() => {

    const buildMap = tree => {
        ALL_PEOPLE.clear();
        let prsn;
        for (let i = 0; i < tree.length; i++) {
            prsn = tree[i];
            ALL_PEOPLE.has(prsn.id) && console.error(
                'Duplicate id',
                prsn,
            );
            prsn.children = new Map();
            ALL_PEOPLE.set(prsn.id, prsn);
        };
    };

    const validate = (data, mapping) => {

        const err = (txt, prsn) => console.error(txt, prsn);

        const validateRelation1 = prsn => {
            if (!prsn.relation_1) return;
            !mapping.has(prsn.relation_1)
            && err(
                'Incorrect relation_1',
                prsn,
            );
        };

        const validateRelation2 = prsn => {
            if (!prsn.relation_2) return;
            !mapping.has(prsn.relation_2)
            && err(
                'Incorrect relation_2',
                prsn,
            );
        };

        const validateIsPartner = prsn => {
            prsn.is_partner = prsn.is_partner ? true: false;
        };

        const validateSex = prsn => {
            !['M', 'F'].includes(prsn.sex) && err(
                'INVALID SEX',
                prsn,
            );
        };

        const validateDOB = prsn => {
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

        const validateDOD = prsn => {
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
            validateRelation1(prsn);
            validateRelation2(prsn);
            validateIsPartner(prsn);
            validateSex(prsn);
            validateDOB(prsn);
            validateDOD(prsn);
        };
    };


    const buildTree = (tree, mapping) => {
        const len = tree.length
        let skip = -1;
        for (let i = len - 1; i >= skip; i--) {
            const prsn = tree.pop();
            const r1 = mapping.get(prsn.relation_1);

            if (!r1) {
                ++skip;
                tree.unshift(prsn);
                continue;
            };

            const chldrn = r1.children;

            if (prsn.is_partner) {
                if (chldrn.has(prsn.id)) continue;
                chldrn.set(prsn.id, []);
                continue;
            };

            if (!prsn.relation_2) {
                const missing = {
                    id: `${r1.id}-MISSING`,
                    is_missing: true,
                    relation_1: r1.id,
                    is_partner: true,
                    sex: r1.sex === 'M' ? 'F' : 'M',
                    name: '(Unknown)',
                };
                mapping.set(missing.id, missing);
                prsn.relation_2 = missing.id;
            };

            const r2_id = prsn.relation_2;
            if (!chldrn.has(r2_id)) {
                chldrn.set(r2_id, [])
            };
            chldrn.get(r2_id).unshift(prsn);
        };
    };


    const renderTree = (tree, mapping) => {

        const renderPerson = prsn => {

            const toggle_trunk = prsn.children?.size
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
                <b>${prsn.name}</b>
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

            const groups = prsn.children.size
                ? [...prsn.children].map(([prtnr_id, childrn]) => {
                    const items =  [
                        renderPartner(mapping.get(prtnr_id)),
                        childrn.length
                            ? `
                            <div class='children'>
                                ${childrn.map(renderBranch).join('')}
                            </div>
                            `
                            : '',
                    ].join('')
                    return `
                    <div class='group'>
                        ${items}
                    </div>`
                }).join('')
                : '';

            return `
            <div class='trunk'>
                ${renderPerson(prsn)}
                ${groups
                    ? `<div class='groups'>${groups}</div>`
                    : ''
                }
            </div>`;

        };
        document.querySelector('.tree').innerHTML = tree.map(renderBranch).join('');
    };

    return tree => {
        buildMap(tree);
        validate(tree, ALL_PEOPLE);
        tree.sort((a, b) => {
            return (a.dob > b.dob) ? 1 : -1
        });
        buildTree(tree, ALL_PEOPLE);
        renderTree(tree, ALL_PEOPLE);
        changeView.searchPerson();
        localStorage.setItem(
            'data',
            JSON.stringify(
                [...ALL_PEOPLE.values()]
            )
        );
    };

})();


const changeView = (() => {

    const CLSS_HIGHLIGHT = '--highlight';

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

    const searchPerson = () => {
        document.querySelectorAll(`.${CLSS_HIGHLIGHT}`).forEach(el => el.classList.remove(CLSS_HIGHLIGHT));
        const str = document.getElementById('id_search').value.toLowerCase();
        if (!str) return showAll();
        const found = [];
        ALL_PEOPLE.forEach(obj => obj.name.toLowerCase().includes(str) && found.push(obj.id));
        const qry = found.map(id => `[data-id='${id}']`).join(',');
        if (!qry) return;
        document.getElementById('id_input_show_all').checked = false;
        hideAll();
        const wrapper = document.querySelector('.tree');
        const els = wrapper.querySelectorAll(qry);
        els.forEach(el => {
            el.classList.add(CLSS_HIGHLIGHT);
            while (el !== wrapper) {
                if (el.classList.contains('trunk')) {
                    const checkbox = el.querySelector(':scope > .person .button__toggle_trunk');
                    checkbox && (checkbox.checked = true);
                };
                el = el.parentNode;
            };
        });
        els[0]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
        });
    };

    const toggleHideAll = ev => {
        ev.target.checked
            ? showAll()
            : hideAll();
    };

    const showAll = () => document.querySelectorAll('.button__toggle_trunk:not(:checked)').forEach(el => el.checked = true);
    const hideAll = () => document.querySelectorAll('.button__toggle_trunk:checked').forEach(el => el.checked = false);
    const zoomPage = ev => document.querySelector('.tree').style.scale = +ev.target.value / 100;

    document.getElementById('id_search').addEventListener('input', searchPerson);
    document.getElementById('id_input_show_all').addEventListener('input', toggleHideAll);
    document.getElementById('id_input_zoom').addEventListener('input', zoomPage);

    return {searchPerson}

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


const dataChanges = (() => {

    const changeLog = new Map();

    const makeImageElement = src => `
        <div tabindex=0 class='edit_person__image_wrapper'>
            <img src='${src}' class='edit_person__image'></img>
            <button class='edit_person__delete_image button'>Delete</button>
        </div>
        `;

    const loadEditor = id => {
        const prsn = ALL_PEOPLE.get(id);
        document.querySelector('.edit_person__id').innerHTML = `ID: ${prsn.id}`;
        document.querySelector('.edit_person__fields_wrapper').innerHTML = [
            {name: 'id', type: 'hidden'},
            {name: 'name', type: 'text', label: 'Name'},
            {name: 'sex', type: 'radio', label: 'Sex', options: ['M', 'F']},
            {name: 'relation_1', type: 'text', label: 'Relation 1'},
            {name: 'relation_2', type: 'text', label: 'Relation 2'},
            {name: 'is_partner', type: 'checkbox', label: 'Is partner'},
            {name: 'dob', type: 'date', label: 'Date of birth'},
            {name: 'dod', type: 'date', label: 'Date of death'},
            {name: 'info', type: 'textarea', placeholder: 'Information', style: 'width: 100%'},
        ].map(({name:fname, type='', label='', options, placeholder='', style=''}) => {

            let input;
            if (type === 'textarea') {
                input = `
                    <textarea
                        name='${fname}'
                        rows='5'
                        style='width: 100%;'
                        placeholder='${placeholder}'
                    >${escapeValue(prsn[fname], true)}</textarea>`;
            } else if (type === 'radio') {
                input = options.map(
                    val => `
                        <label>
                            ${val}
                            <input
                                type='radio'
                                name='${fname}'
                                value="${escapeValue(val, true)}"
                                ${prsn[fname] === val ? 'checked' :''}
                            >
                        </label>`
                ).join('');
            } else {
                input = `
                    <input
                        type='${type}'
                        name='${fname}'
                        placeholder='${placeholder}'
                        value="${escapeValue(prsn[fname], true)}"
                    >`;
            };

            return `
                <label
                    class='${type === 'hidden' ? '--hide' : 'edit_person__field'}'
                    style='${style}'
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
        const prsn = ALL_PEOPLE.get(changeLog.get('id'));
        if (!prsn) return;
        changeLog.delete('id');
        changeLog.forEach((val, field) => prsn[field] = val);
        rebuild([...ALL_PEOPLE.values()]);
        resetChanges();
    };

    const modifyStoredImages = func => {
        const prsn = ALL_PEOPLE.get(getFormData().id);
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

    document.querySelector('.tree').addEventListener('click', ev => {
        const el_person = ev.target.closest('.person');
        el_person && loadEditor(el_person.dataset.id);
    });

    document.getElementById('id_form_edit_person').addEventListener('beforetoggle', ev => {
        const was_openned = ev.newState === 'open';
        document.querySelectorAll('header, main').forEach( el => el.inert = was_openned);
        was_openned && resetChanges();
    });

    document.getElementById('id_form_edit_person').addEventListener('change', logChange);
    document.getElementById('id_button_edit_person_save').addEventListener('click', save);
    document.getElementById('id_input_add_image').addEventListener('input', addImage);
    document.querySelector('.edit_person__images').addEventListener('click', deleteImage);

})();


const importExport = (() => {

    const importFile = async ev => {
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
            [...ALL_PEOPLE.values()]
            .filter(obj => !obj.is_missing)
            .map(obj => {
                if (ALL_PEOPLE.get(obj.relation_2)?.is_missing) {
                    obj.relation_2 = '';
                };
                delete obj.children;
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

    const localCache = localStorage.getItem('data');
    localCache && rebuild(JSON.parse(localCache));

})();

