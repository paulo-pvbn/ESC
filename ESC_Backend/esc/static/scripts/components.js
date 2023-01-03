
function Login(objParams) {

    updateNav();

    document.querySelector("#login-form").addEventListener("submit", function(event) {
        event.preventDefault();

        const formDataObj = getFormObj(new FormData(this));

        sendRequest("/api/token/", false, "POST", formDataObj).then((response) => {

            if(response.ok) {
                return response.json();
            } else if(response.status == 401) {
                showMessage("warning", "Invalid Login or Password. Please try again.");
                return null;
            }

        }).then((response) => {

            if (response != null) {
                const currentUser = {
                    username: formDataObj.username,
                    accessToken: response.access,
                    refreshToken: response.refresh
                }

                sessionStorage.currentUser = JSON.stringify(currentUser);
                updateNav();

                goTo("cases");
            }

        }).catch((error) => {
            handleError(error);
    
        }).finally(() => {
            closeLoading();
        });

    });
}

function Logout() {
    console.log("logout");
    sessionStorage.removeItem("currentUser");
    goTo("login", null, false);
}


function Cases() {

    document.querySelector("#new-case-btn").addEventListener("click", function(event) {
        goTo("newcase");
    });


    function showCase(caseObj) {
        return `
        <div class="ecs-td"><span class="ecs-tcontend">${caseObj.id}</span></div>
        <div class="ecs-td"><span class="ecs-tcontend">${caseObj.name}</span></div>
        <div class="ecs-td"><span class="ecs-tcontend">${caseObj.status_desc}</span></div>
        <div class="ecs-td"><span class="ecs-tcontend ecs-tactions"><a data-caseid="${caseObj.id}" class="case-details-btn esc-list-btn" title="Browse Case Files"><i class="fa fa-book" aria-hidden="true"></i></a></span></div>
        `;

    }

        sendRequest("/esc/api/cases")
        .then((response) => {

            //Updates the user profile
            //-----------------------------------------------
            let user = response.user;

            let currentUser = sessionStorage.currentUser;
            if (currentUser != null) {
                currentUser = JSON.parse(currentUser);
                currentUser.profile = user.profile

                currentUser = JSON.stringify(currentUser);
                sessionStorage.currentUser = currentUser;
            }
            //-----------------------------------------------
            
            const casesTable = document.querySelector("#cases-table");

            casesTable.innerHTML = `
            <div class="ecs-tr-cases">
                <div class="ecs-th"><span class="ecs-tcontend">Code</span></div>
                <div class="ecs-th"><span class="ecs-tcontend">Name</span></div>
                <div class="ecs-th"><span class="ecs-tcontend">Status</span></div>
                <div class="ecs-th"><span class="ecs-tcontend ecs-tactions">#</span></div>
            </div>`;

            for (let caseObj of response.cases) {
                let newRow = document.createElement("div");
                newRow.className = "ecs-tr ecs-tr-cases";
                newRow.innerHTML = showCase(caseObj);
                casesTable.appendChild(newRow);
            }

            document.querySelectorAll(".case-details-btn").forEach((btn) => {
                btn.addEventListener("click", function(event) {
                    goTo("casedetails", {id: this.dataset.caseid});
                });
            });


            updateVisibilityByProfile();

        }).catch((error) => {
            handleError(error);
    
        }).finally(() => {
            closeLoading();
        });
    

}

function formatDate(date_str) {
    const isoDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\..*)?$/;

    let result = date_str;

    if(isoDateFormat.test(date_str))  {
        let dateObj = new Date(date_str);
        result = dateObj.toLocaleString('en-us');
    }

    return result;

}


function CaseDetails(paramObj) {
    //Component state
    let caseData = {}
    let selectedEvidenceFile = 0;
    
    document.querySelector("#title-header").textContent = "";

    //BASIC DATA AND PROCEDURE FORM
    //=========================================================================
    setCustomValidations();

    function fillForm() {
        //Proc Form - Begin
        //----------------------------
        caseData["creation_user_fullname"] = caseData.creation_user.fullname;
        caseData["formated_date"] = formatDate(caseData.creation_date);

        const caseForm = document.querySelector("#case-proc-form");

        document.querySelector("#title-header").textContent = `Case ${String(caseData.id).padStart(3, '0')} - ${caseData.name}`;

        //All spans and form controls  with class ecs-form-data will have their names matched to the names in the API
        //Elements with mathing names will have its textContent or form.value updated in accordance to the presence of the form-control class or element type span
        document.querySelectorAll(".form-control.esc-form-data").forEach((formControl) => {
            formControl.value = caseData[formControl.id];
        });
        document.querySelectorAll("span.esc-form-data").forEach((formControl) => {
            formControl.textContent = caseData[formControl.id];
        });

        caseForm.removeEventListener("submit", submitForm(null));
        console.log("Adding event listener submitform " + caseData.id);
        caseForm.addEventListener("submit", submitForm(caseData.id));

        let currentUser = JSON.parse(sessionStorage.currentUser);
        if(currentUser.profile != 1) {
            document.querySelector("#name").setAttribute("disabled", "");
            document.querySelector("#procedure_number").setAttribute("disabled", "");
        }
       
    }

     //BASIC DATA AND PROCEDURE FORM - END
    //=========================================================================

    //EVIDENCES - BEGIN
    //=========================================================================
    //File upload - Begin
    //----------------------------
    const uploadModal = new bootstrap.Modal('#upload-modal', {
        backdrop: 'static',
        keyboard: false

    });

    const progressBar = document.querySelector('[role="progressbar"]');
    progressBar.style.width = "0%";

    let currentInterval = null;

    document.querySelector("#upload-button").addEventListener("click", function (event) {
        uploadModal.show();

        const doneBtn = document.querySelector("#done-btn");
        const cancelBtn = document.querySelector("#cancel-btn");

        doneBtn.style.display = "none";
        cancelBtn.style.display = "inline-block";

        progressBar.style.width = `0%`;
        progressBar.innerHTML = `0 %`;

        const fileInput = document.querySelector("#formFile");
        const uploadHashInput = document.querySelector("#hash-upload");

        const file = fileInput.files[0];

        const { promise, abort } = uploadEvidenceFile(file, uploadHashInput);

        cancelBtn.onclick = function(event) {
            abort();
            uploadModal.hide();
            ensureModalsGone(); 
        };

        doneBtn.onclick = function(event) {
            uploadModal.hide();
            ensureModalsGone(); 
        }

        promise.then(response => {
        if (response.ok) {
            doneBtn.style.display = "inline-block";
            cancelBtn.style.display = "none";
            uploadModal.hide();
            ensureModalsGone(); 
            showMessage("default", "Evicence File was sent. Please check the status on the evidences list.");
            fileInput.value = "";
            uploadHashInput.value = "";
            

            response.json().then((responseJson) => {
                caseData = responseJson;
                renderAll();
            })
            
        } else {
            // There was an error uploading the file
            uploadModal.hide();
            ensureModalsGone();
            showMessage("error", "There was an error sending the evidence file., Please try again.");
            console.log(response.statusText);
        }

        });

    });

    //File upload - End
    //----------------------------

    //Interchangeable submit form (upload or provide URL) - Begin
    //----------------------------
    document.querySelector("#submit-type").addEventListener("change", function() {
        console.log(this.value);
        
        const uploadForm = document.querySelector("#upload-form");
        const urlForm = document.querySelector("#url-form");

        if(this.value == 1) {
            uploadForm.style.display = "block";
            urlForm.style.display = "none";
        } else if (this.value == 2) {
            uploadForm.style.display = "none";
            urlForm.style.display = "block";
        } 
    });

    const formCollapse = new bootstrap.Collapse(document.querySelector("#send-form-collapsable"), {toggle: false});
    const tableCollapse = new bootstrap.Collapse(document.querySelector("#evid-table-collapsable"), {toggle: true});
    
    document.querySelector("#expand-form-btn").addEventListener("click", function () {
        const fa = this.querySelector("i");

        this.classList.toggle("expanded");

        fa.classList.toggle("fa-chevron-down");
        fa.classList.toggle("fa-chevron-up");

        formCollapse.toggle();
        tableCollapse.toggle();
    });
    //Interchangeable submit form (upload or provide URL) - End
    //----------------------------

    //Evidence list - BEGIN
    //------------------------------------
    function showEvidence(e) {
        
        result = `
        <div class="ecs-td"><span class="ecs-tcontend">${e.filename}</span></div>
        <div class="ecs-td"><span class="ecs-tcontend">${e.filesize_mb}</span></div>
        <div class="ecs-td"><span class="ecs-tcontend">${e.status_desc}</span></div>
        <div class="ecs-td"><span class="ecs-tcontend ecs-tactions">
        <a class="esc-list-btn evid-history-btn" title="Browse Evidence History" data-file="${e.id}"><i class="fa fa-arrows-alt" aria-hidden="true"></i></a>
        <a class="esc-list-btn evid-download-btn" title="Download Evidence File" data-file="${e.id}"><i class="fa fa-download" aria-hidden="true"></i></a>
        
        </span>
        </div>
        `;

        return result;

    }

    function renderEvidenceList() {
        evidencesWithProgressState = new Map();

        const evidencesTable = document.querySelector("#evid-table");
        evidencesTable.innerHTML = `<div class="ecs-tr-evidences">
        <div class="ecs-th"><span class="ecs-tcontend">File Name</span></div>
        <div class="ecs-th"><span class="ecs-tcontend">Size</span></div>
        <div class="ecs-th"><span class="ecs-tcontend">Status</span></div>
        <div class="ecs-th"><span class="ecs-tcontend ecs-tactions">#</span></div>
        </div>`;

        for(let evidenceFile of caseData.evidence_files) {
            let newRow = document.createElement("div");
            newRow.setAttribute("id", `tr-evidence-${evidenceFile.id}`);
            newRow.className = "ecs-tr ecs-tr-evidences";
            newRow.innerHTML = showEvidence(evidenceFile);
            evidencesTable.appendChild(newRow);
        }


        //Add links to see each evidenceFile history
        //--------------------------------------------
        const logsTab = new bootstrap.Tab('#logs-tab');
        document.querySelectorAll(".evid-history-btn").forEach((btn) => {
            btn.addEventListener("click", function(event) {
                
                logsTab.show();
                console.log("Setting shared state evidence file to " + this.dataset.file);
                selectedEvidenceFile = this.dataset.file;
                renderHistory();
            });
        });
        //---------------------------------------------------

        //Add download file actions
        //----------------------------------------------------
        document.querySelectorAll(".evid-download-btn").forEach((btn) => {
            btn.addEventListener("click", function(event) {
                let evidenceId = this.dataset.file;
                downloadEvidenceFile(caseData.id, evidenceId);
            });
        });
        //----------------------------------------------------
        
    }

    function uploadEvidenceFile(file, uploadHashInput) {
        // Create a new FormData object to store the file
        const formData = new FormData();
        
        // Add the file to the form data
        formData.append('evidence_file', file);
        formData.append('hash', uploadHashInput.value);
        
        // Create a variable to store the abort controller
        const abortController = new AbortController();
    
        headers = {}
        let currentUser = sessionStorage.currentUser;
        if (currentUser != null) {
            currentUser = JSON.parse(currentUser);
            
            headers["Authorization"] = "Bearer " + currentUser.accessToken;
        } 
        
        // Use the fetch function to send the file to the server
        const promise = fetch(`/esc/api/evidences/${caseData.id}`, {
            method: 'POST',
            body: formData,
        
            // Use the abort controller to abort the request
            signal: abortController.signal,
    
            headers,
        
            // Listen for progress events and update the progress bar
            onUploadProgress: progressEvent => {
            let progress = progressEvent.loaded / progressEvent.total;
            progressBar.style.width = `${progress}%`;
            progressBar.innerHTML = `${progress} %`;
    
            //progressBar.value = progressEvent.loaded / progressEvent.total;
            
            },
        });
        
        // Return an object with the promise and a method to abort the request
        return {
            promise,
            abort() {
            abortController.abort();
            },
        };
    }

    function downloadEvidenceFile(caseId, evidenceId) {
        let fileName = null;
        let contentType = null;
    
          // Make an API call to the Django REST API endpoint
        sendRequest(`/esc/api/evidences/${caseId}/${evidenceId}`, false).then((response) => {
            if (response.ok) {
                fileName = response.headers.get('Content-Disposition').split(';')[1].split('=')[1];
                contentType = response.headers.get('Content-Type');
    
                return response.blob();
    
            } else {
                throw new Error(`Error downloading file: ${response.statusText}`);
            }
        }).then((response) => {
            
            // Create a Blob from the response data
            const fileBlob = response;
    
            // Create a URL for the file
            const fileUrl = URL.createObjectURL(fileBlob);
    
            // Create a link element and set its href to the file URL
            const downloadLink = document.createElement('a');
            downloadLink.href = fileUrl;
            downloadLink.download = fileName;
    
            console.log("Creating download link for file : " + fileName);
    
            // Append the link element to the body and click it to initiate the download
            document.body.appendChild(downloadLink);
            downloadLink.click();
    
            // Remove the link element from the body
            document.body.removeChild(downloadLink);
    
            // Revoke the file URL
            URL.revokeObjectURL(fileUrl);
    
            sendRequest(`/esc/api/history/${caseData.id}`).then((response) => {
                console.log("received new history");
                console.log(response);
                caseData.history = response;
                renderHistory();
                
            }).catch((error) => {
                handleError(error);
        
            }).finally(() => {
                closeLoading();
            });
    
    
        }).catch((error) => {
            handleError(error);
    
        }).finally(() => {
            closeLoading();
        });
     }
    //Evidence list - END
    //------------------------------------

    //EVIDENCES - END
    //=========================================================================

    //LOGS/HISTORY - BEGIN
    //=========================================================================
    function clearActiveState() {
        document.querySelectorAll(".dropdown-item").forEach((dropdownItem) => {
            dropdownItem.classList.remove("active");
            if(dropdownItem.dataset.file == selectedEvidenceFile) {
                dropdownItem.classList.add("active");
                document.querySelector("#select-evidence-btn").textContent = dropdownItem.textContent;
            }
        })
    }

    function changeEvidence(event) {
        selectedEvidenceFile = this.dataset.file;
        clearActiveState();
        renderHistory();
    }

    function renderEvidenceDropDown() {

        const evidenceDropdown = document.querySelector("#evid-dropdown");
        evidenceDropdown.innerHTML = "";
        
        //Creates the "all files" item
        let newItem = document.createElement("li");
        let newLink = document.createElement("a");
        newLink.className="dropdown-item";
        newLink.dataset.file = 0;
        newLink.textContent = "All Case Evidences / Files";
        newLink.addEventListener("click", changeEvidence);
        newItem.append(newLink);
        evidenceDropdown.appendChild(newItem);

        for(let evidenceFile of caseData.evidence_files) {
            let newItem = document.createElement("li");
            let newLink = document.createElement("a");
            newLink.className="dropdown-item";
            newLink.dataset.file = evidenceFile.id;
            newLink.textContent = evidenceFile.filename;
            newLink.addEventListener("click", changeEvidence);
            newItem.append(newLink);
            evidenceDropdown.appendChild(newItem);
        }
    }

    function renderHistoryList() {
        let historyEventsToShow = caseData.history.filter((logItem) => {return selectedEvidenceFile == 0 || logItem.evidence_file.id==selectedEvidenceFile});

        let historyTable = document.querySelector("#hist-table");

        historyTable.innerHTML = `<div class="ecs-tr-logs">
        <div class="ecs-th"><span class="ecs-tcontend">File Name</span></div>
        <div class="ecs-th"><span class="ecs-tcontend">Operation</span></div>
        <div class="ecs-th"><span class="ecs-tcontend">Date/Time</span></div>
        <div class="ecs-th"><span class="ecs-tcontend ecs-tactions">User</span></div>
        </div>`;

        for(let logItem of historyEventsToShow) {
            const newRow = document.createElement("div");
            newRow.className = "ecs-tr ecs-tr-logs";
            newRow.innerHTML = `<div class="ecs-td"><span class="ecs-tcontend">${logItem.evidence_file.filename}</span></div>
                                <div class="ecs-td"><span class="ecs-tcontend">${logItem.operation_desc}</span></div>
                                <div class="ecs-td"><span class="ecs-tcontend">${formatDate(logItem.date)}
                                </span></div>
                                <div class="ecs-td"><span class="ecs-tcontend ecs-tactions">${logItem.user.fullname}</span></div>`
            
            historyTable.append(newRow);                  
        }
    }
    //=========================================================================
    //LOGS HISTORY - END


    function init() {
        if(paramObj.caseObj != null) {
            //caseObj already provided - usefull after creating a new case
            caseData = paramObj.caseObj;
            renderAll();
    
        } else {
            sendRequest(`/esc/api/cases/${paramObj.id}`).then((caseObj) => {
                caseData = caseObj;
                renderAll();
                
            }).catch((error) => {
                handleError(error);
        
            }).finally(() => {
                closeLoading();
            });
        }


    }

    function renderHistory() {
        renderEvidenceDropDown();
        clearActiveState();
        renderHistoryList();
    }

    function renderAll() {
        fillForm();
        renderEvidenceList();
        renderHistory();
        updateVisibilityByProfile();
    }

    init();
}

function CaseNew(paramObj) {
    setCustomValidations();

    const caseForm = document.querySelector("#case-proc-form");
    caseForm.addEventListener("submit", submitForm(null));

    //Hides parts of the template suited only for when its an existing element
    document.querySelectorAll(".ecs-exists").forEach((elementToHide) => {
        elementToHide.style.display = "none";
    });    
}

//HELPER FUNCTIONS
//========================================
let loadingModal = null;
let messageModal = null;

function showLoading() {
    loadingModal = new bootstrap.Modal('#esc-loading-modal', {
        backdrop: 'static',
        keyboard: false,
        scrollable: false
    
    });

    loadingModal.show();
}

function closeLoading() {
    loadingModal.hide();
    ensureModalsGone();
}

function showMessage(type, text) {
    messageModal = new bootstrap.Modal('#esc-msg-modal', {
        backdrop: 'static',
        keyboard: false
    
    });

    document.querySelectorAll(".esc-msg-title").forEach((msgComponent) => {
        msgComponent.style.display = "none";
    });
    document.querySelectorAll(`.esc-msg-${type}`).forEach((msgComponent) => {
        msgComponent.style.display = "inline";
    });

    document.querySelectorAll(".esc-msg-btn").forEach((msgComponent) => {
        msgComponent.style.display = "none";
    });
    document.querySelectorAll(`.esc-msg-btn-${type}`).forEach((msgComponent) => {
        msgComponent.style.display = "inline-block";
    });


    document.querySelector("#esc-msg-text").textContent = text;

    messageModal.show();
}

function closeMessage() {
    messageModal.hide();
    ensureModalsGone(); 
}

function ensureModalsGone() {
    document.querySelector("body").classList.remove('modal-open');
    document.querySelectorAll(".modal-backdrop").forEach((element) => {element.remove();});
}


function handleError(error) {
    closeLoading();
    console.log(error);
    showMessage("error", `There was an error. 
    Please check your internet connection and try again. If the error persists 
    please contact the gonvernment agency support team.`);
    goTo("error");
}

document.querySelector("#esc-msg-close-btn").addEventListener("click", function(event) {
    closeMessage();
});

function sendRequest(uri, responseJson=true, method="GET", dataObj, showLoadingSpinner = true) {
    console.log("Calling sendRequest with dataObj");
    console.log(dataObj);

    const headers = {
        'Content-Type': 'application/json; charset=utf-8'
    };

    let currentUser = sessionStorage.currentUser;
    if (currentUser != null) {
        currentUser = JSON.parse(currentUser);
        
        headers["Authorization"] = "Bearer " + currentUser.accessToken;
    } 

    const options = {
        method,
        headers
    }
    if(["POST", "PUT"].includes(method.toUpperCase())) {
        options.body = JSON.stringify(dataObj)
    }

    if(showLoadingSpinner) {
        showLoading();
    }
    
    return fetch(uri, options).then((response) => {

        if (responseJson) {
            if(!response.ok) {
                throw new Error(`${response.statusText}`);
            }
            //If the caller wants to handle server side validation errors, it must pass responseJson false and handle for itself
            return response.json();    
        } else {
            return response;
        }
        

    }).catch((error) => {
        handleError(error);

    }).finally(() => {
        if(showLoadingSpinner) {
            closeLoading();
        }
     
    });
}

//Depends on the app routes object
async function goTo(route_id, paramsObj = null, animate=true) {

    if (route_id == currentRoute) {
        return;
    }

    const routeObj = routes[route_id];
    if (routeObj.auth) {
        if(sessionStorage.currentUser == null) {
            goTo("login");
            return;
        };
    }

    async function doGo() {
        currentRoute = route_id;

        if (routeObj.templateUri != null) {
            const response = await sendRequest(routeObj.templateUri, false);
            const template = await response.text();
            appRoot.innerHTML = template;
        } else if(routeObj.template != null) {
            appRoot.innerHTML = routeObj.template;
        }

        if(routeObj.logic != null) {
            routeObj.logic(paramsObj);
        }

        if(animate) {
            appRoot.style.animationPlayState = "paused";
            appRoot.style.animationName = "fade-in";
            appRoot.style.animationPlayState = "running";
            appRoot.style.animationDuration = "1s"
        }
    }

    if(animate) {
        appRoot.style.animationPlayState = "paused";
        appRoot.style.animationName = "fade-out";
        appRoot.style.animationPlayState = "running";
        appRoot.style.animationDuration = "1s"
    
        appRoot.addEventListener('animationend', async function()  {
            doGo();
        }, {once: true});

    } else {
        doGo();
    }

    
    
}

function getFormObj(formData) {
    formObj = {};
    formData.forEach(function(value, key) {
        formObj[key] = value;
    });
    return formObj;
}

//Shared behaviour between new case and existing case form
//Custom form server side validations
//----------------------------------------------

function resetValidity(event) {
    event.target.setCustomValidity("");
}

function setCustomValidations() {
    //Prevents field for being premanently tagged with the server validation status by clearing it after any value changes
    document.querySelectorAll(".reset-on-change").forEach((inputField) => {

        inputField.removeEventListener("change", resetValidity);
        inputField.addEventListener("change", resetValidity);

    });

}

function displayServerValidationErrors(aForm, errors) {

    fieldIds = (errors != null) ? Object.keys(errors) : []

    console.log("aForm is");
    console.log(aForm);

    nonFieldErrors = []

    //Sets custom validity for each field based on the error returned
    fieldIds.forEach((id) => {
        //Try to find input field with matching id and sets de custom validity with the error message
        const errorTarget = document.getElementById(id);
        if(errorTarget != null) {
            console.log("Setting custom validity");
            console.log(errorTarget);
            console.log(errors[id]);
            errorTarget.setCustomValidity(errors[id]);
        } else {
            //Error does not match any field, display error below the form instead
            const errorItem = document.createElement("li");
            errorItem.textContent = `Problem validating form: ${id} - ${errors[id]}`
            nonFieldErrors.push(errors[id]);
        }
    });

    //Forces display of validation errors without submiting the form
    console.log('reporting validity');
    aForm.reportValidity();
    
    if(nonFieldErrors.length > 0) {
        showMessage("error", "Validation Errors: " + nonFieldErrors);
    }
}

function submitForm(caseId = null) {
    const newCase = (caseId==null);
    const method = newCase ? "POST":"PUT";
    
    if(newCase) {
        caseId = "";
    }

    const uri = `/esc/api/cases/${caseId}`;
    console.log(`caseId is ${caseId}`);
    console.log(`uri is ${uri}`);

    let resultFn = function doSubmit(event) {
        
        console.log("calling doSubmit")
        event.preventDefault();

        const caseForm = event.target;
        console.log("Case form is " + caseForm);
       
        if(this.checkValidity()) {
            //Only sends data to server if client validations passed
    
            const formDataObj = getFormObj(new FormData(caseForm));
            console.log("Form data obj is below");
            console.log(formDataObj);

            sendRequest(uri, false, method, formDataObj).then((response) => {
                //If the response is not ok but "errors" is present, indicates a validation error, so dont throw Exception
                return response.json();

            }).then((response) => {
            
                if(response.errors == null) {
    
                    showMessage("default", `Case successfully ${newCase?"created":"updated"}.`);
                    if(newCase) {
                        //If case just created, re-render the page with the existing case layout
                        goTo("casedetails", {caseObj: response});
                    }
                    
                  } else {
                    //Server side validation failed, update validation status for fields
    
                    displayServerValidationErrors(caseForm, response.errors);
                }

            }).catch((error) => {
                handleError(error);
        
            }).finally(() => {
                closeLoading();
            });
        }
    };
    
    return resultFn;
}

function updateVisibilityByProfile() {
    let currentUser = JSON.parse(sessionStorage.currentUser);
    let visibleClass = `profile-${currentUser.profile}`;
    console.log("Visible class is " + visibleClass);

    document.querySelectorAll(".profile").forEach((profileElement) => {
        console.log(profileElement);
        profileElement.style.display = profileElement.classList.contains(visibleClass)?"inline-block":"none";
    });
}
//----------------------------------------------


  

//===========================================================================