
const searchInput = document.querySelector('#searchInput');
const dropBtn = document.querySelector('.dropBtn');
const dropDownOptions = document.querySelectorAll('#dropDownList option');

dropBtn.addEventListener('click', showDropList);
searchInput.addEventListener('keyup', filterOptions);

for (let i=0; i < dropDownOptions.length; i++) {
    dropDownOptions[i].addEventListener('click', () => {
        optionClick(dropDownOptions[i]);
    });
}

function showDropList() {
    document.querySelector('#dropDownList').classList.toggle('show');
}

function optionClick(opt) {
    optValue = opt.value;
    alert(optValue);
    console.log(optValue);
}

function filterOptions() {

    let input, filter, options, i;

    input = document.querySelector('#searchInput');
    filter = input.value.toUpperCase();
    options = document.querySelectorAll('#dropDownList option');
    
    for (i = 0; i < options.length; i++) {
        txtValue = options[i].textContent || options[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            options[i].style.display = '';
        } else {
            options[i].style.display = 'none';
        }
    }
}
