'use strict';
var bradlysTrack = {
    lis: $('.results').find('li'),
    windowHeight: $(document).outerHeight(),
    currentScroll: $(window).scrollTop(),
    shouldMakeRequest: false,
    requestLength: 20,
    initHeight: $('.search-results').outerHeight(),
    finished: false,
    stickySearch: $('.sticky-search'),
    stickySearchOffset: $('.sticky-search').offset().top,
    requestMade: false,
    loader: '<div class="loader"><span class="loader-text"></span>Loading....</div>'
};

//Stores all the companies as keys and the values are the dates applied.
var bradlysCompanies = {};
//add a surrounding div with 'base' class to this.
//This is the box used for adding a job spreadsheet file.
var HTMLBox =
    '<div class="card-header"><h3>Ultra Advanced Search</h3></div>' +
    '<div class="card-content box search container">' +
        '<input type="file" id="bradlys-crunchbase-job-search-file" name="file">' +
    '</div>' +
    '<div class="card-content box container">' +
        '<button id="bcsh-visited-btn">Copy Visited(<span id="bcsh-visited">0</span>)</button>' +
        '<TEXTAREA id="bcsh-hidden-visited" STYLE="display:none;"></TEXTAREA>' +
    '</div>';
//used to parse CSV files; not yet implemented here.
var papaParseScript = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/4.1.2/papaparse.min.js';
//used to parse xlsx files
var xlsxScript = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.8.0/xlsx.full.min.js';
var scripts = [xlsxScript];
//different colors for different result types
var resultColors = {
    'appliedRecently' : 'hsla(0, 65%, 70%, 0.5)',
    'appliedLongAgo' : 'hsla(110, 85%, 75%, 0.6)',
    'visitedRecently' : 'hsla(289, 75%, 35%, 0.8)',
    'uninterested' : 'hsla(227, 75%, 45%, 0.7)'
};
var todaysDate = new Date();

var SIXMONTHS = 180*1000*60*60*24;
var DAYS_45 = 45*60*60*24*1000;

function bradlysCrunchbaseSearch() {
    if (bradlysTrack.finished === true || !CB.AdvancedSearch.hasSearch()) {
        return;
    }
    var el = CB.responsive.el;
    var $window = $(window);
    var $documentHeight = el.$documentHeight() > 200 ? el.$documentHeight() - 50 : el.$documentHeight();
    if ((($window.scrollTop() + $window.outerHeight()) >= $documentHeight) && (bradlysTrack.requestMade === false)) {
        var cont = $('.results.container');
        cont.append(bradlysTrack.loader);
        CB.AdvancedSearch.query(true, function (success, callback) {
            var results = [];
            var result = [];
            var data = callback.hits;
            var place = $('.results ul');
            $(data).each(function (i) {
                //var vR = visitedRecently(data[i]);
                //var un = isUninterested(data[i]);
                var temp = CB.Autocomplete.template(data[i]).trim();
                var companyName = data[i].name;
                var style = getStyleForCompany(companyName);
                var wrap = '<li' + (style.length > 0 ? (' style="' + style + '"') : '') +
                    ' onclick="addToVisited(\'' + companyName + '\');"' +
                    ">" + temp + '</li>';
                result.push(wrap);
            });
            place.append(result);
            $('.loader').remove();
            return bradlysTrack.requestMade = false;
        }); // end makeAjaxRequest
        return bradlysTrack.requestMade = true;
    }
}

var visited = {};

function getStyleForCompany(name) {
    var colors = [];
    appliedRecently(name) ? colors.push(resultColors.appliedRecently) : '';
    appliedLongAgo(name) ? colors.push(resultColors.appliedLongAgo) : '';
    visitedRecently(name) ? colors.push(resultColors.visitedRecently) : '';
    var style = '';
    if (colors.length === 1) {
        style = 'background-color: ' + colors[0] + ';"';
    } else if (colors.length > 1) {
        style = 'background: linear-gradient(to right';
        for (var i in colors) {
            style += ', ' + colors[i];
        }
        style += ');"';
    }
    return style;
}

function addToVisited(name) {
    var company = name;
    if (!(company in visited)) {
        visited[company] = true;
        var bcsh_visited = document.querySelector('#bcsh-visited');
        bcsh_visited.innerHTML = parseInt(bcsh_visited.innerHTML) + 1;
    }
}

function appliedRecently(name) {
    if (!name || name.length < 1){
        return false;
    }
    var lowerCaseName = name.toLowerCase();
    if (lowerCaseName in bradlysCompanies) {
        if ('lastApplied' in bradlysCompanies[lowerCaseName] &&
            todaysDate - bradlysCompanies[lowerCaseName].lastApplied < SIXMONTHS) {
            return true;
        }
    }
    return false;
}

function appliedLongAgo(name) {
    if (!name || name.length < 1){
        return false;
    }
    var lowerCaseName = name.toLowerCase();
    if (lowerCaseName in bradlysCompanies) {
        if ('lastApplied' in bradlysCompanies[lowerCaseName] &&
            todaysDate - bradlysCompanies[lowerCaseName].lastApplied >= SIXMONTHS) {
            return true;
        }
    }
    return false;
}

function visitedRecently(name) {
    if (!name || name.length < 1){
        return false;
    }
    name = name.toLowerCase();
    if (name in bradlysCompanies) {
        if ('lastVisited' in bradlysCompanies[name] && (todaysDate - bradlysCompanies[name].lastVisited) < DAYS_45) {
            return true;
        }
        //return true;
    }
    return false;
}

function loadDependencyScripts() {
    for (var i in scripts) {
        var s = document.createElement('script');
        s.src = scripts[i];
        s.onload = function () {
            this.parentNode.removeChild(this);
        };
        (document.head || document.documentElement).appendChild(s);
    }
}

function replaceWindowScroll() {
    $(window).scroll();
    $(window).unbind('scroll');
    $(window).scroll(function() {
        bradlysCrunchbaseSearch();
    });
}

function insertFileBox() {
    var searchElement = document.getElementsByClassName('base search');
    if(searchElement){
        var HTMLBoxElement = document.createElement('div');
        HTMLBoxElement.innerHTML = HTMLBox;
        HTMLBoxElement.className = 'base';
        HTMLBoxElement.querySelector('#bradlys-crunchbase-job-search-file').onchange = parseFileIntoState;
        var copyVisitedBtn = HTMLBoxElement.querySelector('#bcsh-visited-btn');
        copyVisitedBtn.addEventListener('click', function(event) {
            var textbox = document.querySelector('#bcsh-hidden-visited');
            textbox.value = '';
            for (var i in visited) {
                textbox.value += i + ', ' + todaysDate.toString() + ' \r\n';
            }
            var range = document.createRange();
            range.selectNodeContents(textbox);
            window.getSelection().addRange(range);
            try {
                document.execCommand('copy');
            } catch(err) {
                console.log('Oops, unable to copy');
            }
            window.getSelection().removeAllRanges();
        });
        searchElement[0].parentNode.insertBefore(HTMLBoxElement, searchElement[0]);
    } else {
        console.log("Couldn't find search element. I guess CrunchBase updated their UI. Tell Bradly.");
    }
}

function restyleExistingElements() {
    var elements = document.getElementsByClassName('results container')[0];
    elements = elements.getElementsByTagName('li');
    for (var i = 0; i < elements.length; i++ ) {
        var name = elements[i].querySelector('a').getAttribute('href');
        if (name.indexOf('/organization/') !== -1){
            name = name.substr(14);
        }
        if (name in bradlysCompanies) {
            var style = getStyleForCompany(name);
            if (style.length > 0) {
                elements[i].setAttribute('style', style);
            }
            elements[i].setAttribute('onclick', 'addToVisited(\'' + name + '\');');
        }
    }
}

function parseFileIntoState(e) {
    var files = e.target.files;
    if(files.length === 0){
        return false;
    }
    var file = files[0];
    var fileName = file.name;
    var fileExt = fileName.split('.');
    if(fileExt.length < 2){
        return false;
    }
    fileExt = fileExt[fileExt.length - 1].toLowerCase();
    if(fileExt === 'csv'){
        //Papa Parse
    } else if (fileExt === 'xlsx'){
        //js-xlsx script from github
        var fileReader = new FileReader();
        fileReader.onload = function(evt){
            if(evt.target.readyState != 2) return;
            if(evt.target.error) {
                alert('Error while reading file');
                return;
            }
            var data = evt.target.result;
            var workbook = XLSX.read(data, {type: 'binary'});
            //applied jobs sheet
            var worksheet = workbook.Sheets[workbook.SheetNames[0]];
            var companyColumn = 'A';
            var dateColumn = 'C';
            var companyRow = false;
            var dateRow = false;
            for (var j in worksheet) {
                if (j === '!ref') {
                    continue;
                }
                if (worksheet[j].v === 'Company' && !companyRow) {
                    companyColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                    companyRow = j.match(new RegExp('\\d+'))[0];
                } else if (worksheet[j].v.indexOf('Date') === 0 && !dateRow) {
                    dateColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                    dateRow = j.match(new RegExp('\\d+'))[0];
                }
                if (companyRow && dateRow) {
                    break;
                }
            }
            for (j in worksheet) {
                if (j === '!ref') {
                    continue;
                }
                var currentColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                var currentRow = j.match(new RegExp('\\d+'))[0];
                if (currentColumn !== companyColumn || parseInt(currentRow) <= parseInt(companyRow)) {
                    continue;
                }
                var companyName = worksheet[j].v.toLowerCase();
                var appliedDate = worksheet[dateColumn+currentRow];
                if (appliedDate && 'w' in appliedDate) {
                    appliedDate = appliedDate.w;
                    appliedDate = new Date(appliedDate);
                }
                if (companyName in bradlysCompanies && bradlysCompanies[companyName].lastApplied) {
                    var lastApplied = bradlysCompanies[companyName].lastApplied;
                    bradlysCompanies[companyName].lastApplied = new Date(Math.max(lastApplied, appliedDate));
                } else {
                    bradlysCompanies[companyName] = {
                        'lastApplied' : appliedDate,
                        'uninterested' : false,
                        'lastVisited' : false
                    };
                }
            }
            //visited companies sheet
            worksheet = workbook.Sheets[workbook.SheetNames[1]];
            companyColumn = 'A';
            dateColumn = 'C';
            companyRow = false;
            dateRow = false;
            for (var j in worksheet) {
                if (j === '!ref') {
                    continue;
                }
                if (worksheet[j].v === 'Company' && !companyRow) {
                    companyColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                    companyRow = j.match(new RegExp('\\d+'))[0];
                } else if (worksheet[j].v.indexOf('Date') === 0 && !dateRow) {
                    dateColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                    dateRow = j.match(new RegExp('\\d+'))[0];
                }
                if (companyRow && dateRow) {
                    break;
                }
            }
            for (j in worksheet) {
                if (j === '!ref') {
                    continue;
                }
                var currentColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                var currentRow = j.match(new RegExp('\\d+'))[0];
                if (currentColumn !== companyColumn || parseInt(currentRow) <= parseInt(companyRow)) {
                    continue;
                }
                var companyName = worksheet[j].v.toLowerCase();
                var visitedDate = worksheet[dateColumn+currentRow];
                if (visitedDate && 'w' in visitedDate) {
                    visitedDate = visitedDate.w;
                    visitedDate = new Date(visitedDate);
                }
                if (companyName in bradlysCompanies && bradlysCompanies[companyName].lastVisited) {
                    var lastVisited = bradlysCompanies[companyName].lastVisited;
                    bradlysCompanies[companyName].lastVisited = new Date(Math.max(lastVisited, visitedDate));
                } else {
                    bradlysCompanies[companyName] = {
                        'lastApplied' : false,
                        'uninterested' : false,
                        'lastVisited' : visitedDate
                    };
                }
            }
            replaceWindowScroll();
            restyleExistingElements();
        };
        fileReader.readAsBinaryString(file);
    }
}

loadDependencyScripts();
insertFileBox();
