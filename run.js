
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
        return `
        <div
            class='person ${prsn.sex === 'M' ? 'male' : 'female'}'
            data-id='${prsn.id}'
        >
            <b>${prsn.name}</b>
            <label
                style='
                    display: flex;
                    text-align: center;
                    '
            >

                ${prsn.children?.size
                    ? `<input type='checkbox' class='button__toggle_trunk' checked>`
                    : ''
                }
            </label>
            ${prsn.image ? `<img src=${prsn.image}></img>` : ''}
            <small>${prsn.id}</small>
            <small>${prsn.dob}</small>
            <button class='button__edit' popovertarget='id_edit'>
                Edit
            </button>
        </div>`;
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


const rebuild = tree => {
    buildMap(tree);
    validate(tree, ALL_PEOPLE);
    tree.sort((a, b) => {
        return (a.dob > b.dob) ? 1 : -1
    });
    buildTree(tree, ALL_PEOPLE);
    renderTree(tree, ALL_PEOPLE);
    localStorage.setItem('tree', JSON.stringify([...ALL_PEOPLE.values()]))
};


const searchPerson = ev => {

    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

    const str = ev.target.value.toLowerCase();
    if (!str) {
        allItems.show();
        return
    };

    const found = [];
    ALL_PEOPLE.forEach(obj => obj.name.toLowerCase().includes(str) && found.push(obj.id));
    const qry = found.map(id => `[data-id='${id}']`).join(',');
    if (!qry) return;
    document.getElementById('id_input_show_all').checked = false;
    allItems.hide();
    const wrapper = document.querySelector('.tree');
    wrapper.querySelectorAll(qry).forEach(el => {
        el.classList.add('highlight');
        while (el !== wrapper) {
            if (el.classList.contains('trunk')) {
                const checkbox = el.querySelector(':scope > .person .button__toggle_trunk');
                checkbox && (checkbox.checked = true);
            };
            el = el.parentNode;
        };
    });
};


const allItems = (() => {
    return {
        show: () => document.querySelectorAll('.button__toggle_trunk:not(:checked)').forEach(el => el.checked = true),
        hide: () => document.querySelectorAll('.button__toggle_trunk:checked').forEach(el => el.checked = false),
    };
})();


const toggleHideAll = ev => {
    ev.target.checked
        ? allItems.show()
        : allItems.hide();
};


const loadEditor = id => {
    const prsn = ALL_PEOPLE.get(id);

    const fields = [
        ['id', 'hidden'],
        ['relation_1', 'text', 'Relation 1'],
        ['relation_2', 'text', 'Relation 2'],
        ['is_partner', 'checkbox', 'Is partner'],
        ['name', 'text', 'Name'],
        ['sex', 'radio', 'Sex', ['M', 'F']],
        ['dob', 'date', 'Date of birth'],
        ['dod', 'date', 'Date of death'],
        ['info', 'text', 'Other information']
    ];

    document.getElementById('id_edit').innerHTML = `
        <b>
            ${prsn.name}
        </b>
        <form class='edit_person__form'>
            ${fields.map(([fname, type, label, options]) => {

                const input = (type === 'radio')
                    ? options.map(
                        val => `<label>${val}<input type='radio' name='${fname}' value=${val} ${prsn[fname] === val ? 'checked' :''}></label>`
                    ).join('')
                    : `<input type='${type}' name='${fname}' value=${prsn[fname] === undefined ? '' : prsn[fname]}>`

                return `
                    <label ${type === 'hidden' ? `class='--hide'` : ''}>
                        ${label}
                        ${input}
                    </label>
                    `;
            }).join('')}
        </form>
    `;

};


const applyChanges = ev => {
    const field_name = ev.target.name;
    const fields = Object.fromEntries(new FormData(ev.target.closest('form')));
    ALL_PEOPLE.get(fields.id)[field_name] = fields[field_name];
    const tree = [...ALL_PEOPLE.values()];
    rebuild(tree);
};


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

document.getElementById('id_input_upload_date').addEventListener('input', parseImport);

document.getElementById('id_search').addEventListener('input', searchPerson);

document.getElementById('id_input_show_all').addEventListener('input', toggleHideAll);

document.querySelector('body').addEventListener('click', ev => {

    const el_person = ev.target.closest('.person');
    if (!el_person) return;

    if (ev.target.closest('.button__edit')) {
        return loadEditor(el_person.dataset.id);
    };

});

document.getElementById('id_input_upload_image').addEventListener('input', ev => {
    const file = ev.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const src = reader.result;
        navigator.clipboard.writeText(src);
        document.getElementById('id_preview_image').src = src;
    };
    reader.readAsDataURL(file);
});

document.getElementById('id_button_export').addEventListener('click', exportToJSON);

document.getElementById('id_edit').addEventListener('change', applyChanges);

