
const ALL_PEOPLE = new Map();


const parseImport = async ev => {

    const parseCSV = txt => {

        const csvToArray = text => {
            let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
            for (l of text) {
                if ('"' === l) {
                    if (s && l === p) row[i] += l;
                    s = !s;
                }
                else if (',' === l && s) l = row[++i] = '';
                else if ('\n' === l && s) {
                    if ('\r' === p) row[i] = row[i].slice(0, -1);
                    row = ret[++r] = [l = '']; i = 0;
                } else row[i] += l;
                p = l;
            }
            return ret;
        };

        const grid = csvToArray(txt);
        const rows = grid.filter(row => row.join('').length > 1); //Remove blank rows
        const fields = rows.shift();
        return rows.map(
            row => Object.fromEntries(
                fields.map((key, idx) => [key, row[idx]])
            )
        );

    };

    const file = ev.target.files[0];
    const split_file_name = file.name.split('.');

    const parser = {
        json: JSON.parse,
        csv: parseCSV,
    }[split_file_name[split_file_name.length - 1]];

    if (!parser) {
        prompt('Invalid file type');
        return;
    };

    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = e => {
        rebuild(parser(e.target.result));
        ev.target.value = '';
    };
};


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
            return `
            <button
                class='person ${prsn.sex === 'M' ? '--male' : '--female'}'
                data-id='${prsn.id}'
                popovertarget='id_form_edit_person'
            >
                <b>${prsn.name}</b>
                ${toggle_trunk}
                ${prsn.image ? `<img src=${prsn.image}></img>` : ''}
                <small>${prsn.id}</small>
                <small>${prsn.dob}</small>
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
        localStorage.setItem('tree', JSON.stringify([...ALL_PEOPLE.values()]));
    };

})();

const changeView = (() => {

    const CLSS_HIGHLIGHT = '--highlight';

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
        els[0]?.scrollIntoView({behavior: 'smooth'});
    };

    const toggleHideAll = ev => {
        ev.target.checked
            ? showAll
            : hideAll;
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

const loadEditor = id => {
    const prsn = ALL_PEOPLE.get(id);

    document.querySelector('.edit_person__id').innerHTML = `ID: ${prsn.id}`;
    document.querySelector('.edit_person__fields_wrapper').innerHTML = [
        ['id', 'hidden'],
        ['name', 'text', 'Name'],
        ['sex', 'radio', 'Sex', ['M', 'F']],
        ['relation_1', 'text', 'Relation 1'],
        ['relation_2', 'text', 'Relation 2'],
        ['is_partner', 'checkbox', 'Is partner'],
        ['dob', 'date', 'Date of birth'],
        ['dod', 'date', 'Date of death'],
        ['info', 'text', 'Other information']
    ].map(([fname, type, label, options]) => {
        const input = (type === 'radio')
            ? options.map(
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
            ).join('')
            : `
                <input
                    type='${type}'
                    name='${fname}'
                    value="${escapeValue(prsn[fname])}"
                >`

        return `
            <label class='${type === 'hidden' ? `--hide` : 'edit_person__field'}'>
                ${label}
                ${input}
            </label>
            `;
    }).join('');

};


const dataChanges = (() => {

    const changeLog = new Map();

    const resetChanges = () => changeLog.clear();

    const logChange = ev => {
        const field_name = ev.target.name;
        const fields = Object.fromEntries(new FormData(ev.target.closest('form')));
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

    document.getElementById('id_form_edit_person').addEventListener('change', logChange);
    document.getElementById('id_button_edit_person_save').addEventListener('click', save);

    return {
        resetChanges,
    };

})();


const exportToJSON = () => {
    const el = document.createElement('a');
    el.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,'
        + encodeURIComponent(JSON.stringify(
            [...ALL_PEOPLE.values()]
            .filter(obj => !obj.is_missing)
            .map(obj => {
                if (ALL_PEOPLE.get(obj.relation_2)?.is_missing) {
                    obj.relation_2 = '';
                };
                delete obj.children;
                return obj;
            })
        ))
    );
    el.setAttribute('download', 'tree.json');
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);

};


if (localStorage.getItem('tree')) {
    rebuild(JSON.parse(localStorage.getItem('tree')))
};

const imageToString = ev => {
    const file = ev.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const src = reader.result;
        navigator.clipboard.writeText(src);
        console.log(src);
        // document.getElementById('id_preview_image').src = src;
    };
    reader.readAsDataURL(file);
};

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

document.getElementById('id_input_upload_date').addEventListener('input', parseImport);
document.querySelector('body').addEventListener('click', ev => {
    const el_person = ev.target.closest('.person');
    el_person && loadEditor(el_person.dataset.id);
});
document.getElementById('id_input_upload_image').addEventListener('input', imageToString);
document.getElementById('id_button_export').addEventListener('click', exportToJSON);

document.getElementById('id_form_edit_person').addEventListener('beforetoggle', ev => {
    const was_openned = ev.newState === 'open';
    document.querySelectorAll('header, main').forEach( el => el.inert = was_openned);
    was_openned && dataChanges.resetChanges();
});
