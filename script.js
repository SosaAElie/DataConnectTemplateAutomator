/**
 * @typedef {Object} Well - creates a new type named 'Well'
 * @property {Number} well - The number of the well according the 384 well plate
 * @property {String} wellPosition - The well position i.e A1, B2, C3, etc in the 384 Well Plate
 * @property {String} sampleName - The sample name
 * @property {String} sampleColor - The sample color that is shown in the DataConnect website
 * @property {String} biogroupName - Not sure, probably something that relates to a property on the DataConnect Website
 * @property {String} biogroupColor - Not sure, probably something that relates to a property on the DataConnect Website
 * @property {String} targetName - The name of the target, i.e the name of the gene/DNA sequence aimed to be replicated
 * @property {String} targetColor - The color assigned to the target shown on the DataConnect website
 * @property {String} task - Not sure, probably something that relates to a property on the DataConnect Website
 * @property {String} reporter - The flourophore molecule that emits the specified wavelength when it's bond to the probe is cleaved by Taq Polymerase
 * @property {String} quencher - The molecule that absorbs the emitted wavelength by the flourophore and prevents its wavelength from being read by the QuantStudio
 * @property {String} quantity - Not sure, probably something that relates to a property on the DataConnect Website
 * @property {String} comments - Not sure, probably something that relates to a property on the DataConnect Website
 * @property {Number} well96Number - The number of the well on the 96 well plate going from left to right i.e well in A1 is 1, A2 is 2, B1 is 13, B2 is 14, etc
 * @property {String} well96Position - The position of the sample in the 96 well plate, A1, A2, A3, etc
 * @property {Array<String>} well384Positions - The positions the sample is in, in the 384 well template relative to its position in the 96 well template and whether its in duplicates or triplicates
 * @property {Array<String>} targets - The name of the targets, i.e the name of the gene/DNA sequence aimed to be replicated
 * @property {Array<String>} reporters - The flourophore molecules that emit the specified wavelength when it's bond to the probe is cleaved by Taq Polymerase
 * @property {Array<Number>} wellNumbers - The well number of the sample in the 384 well template
 * @property {Function} get384WellArray - A function that provides the properties in an array that can then be used by the Papa.unparse method to create a string which can be written to the csv file
 * @property {Function} getLessShallowCopy - A function that retuns a 1 layer deep copy of the object itself
 */


function main(){
    const fileSubmitForm = document.getElementById("select-files");
    const downloadContainer = document.getElementById("download-container");
    const diagramContainer = document.getElementById("Well96-diagram");
    const fileInput = document.getElementById("96-well-csv");
    const diagram384Container = document.getElementById("Well384-diagram");
    document.getElementById("add").addEventListener("click", addTargetReporterInput);
    document.getElementById("remove").addEventListener("click", removeTargetReporterInput);
    let stableWells;
    let fileCount = 0;
    let selectedFile;


    fileInput.addEventListener("change",event=>{
        event.preventDefault();
        selectedFile = event.target.files[0];  
        parseTemplateFile(selectedFile)
            .then(parsedCsv=>{
                const template = get96WellTemplate(parsedCsv);
                stableWells = convertToWells(template);
                const currentNumChildren = diagramContainer.children.length;
                if(currentNumChildren > 0){
                    for(let i = 0; i < currentNumChildren; i++) diagramContainer.removeChild(diagramContainer.firstChild);
                }
                diagram96Well(stableWells, diagramContainer)
            })
            .catch(err => console.log(err));
    })

    fileSubmitForm.addEventListener("submit", event =>{
        event.preventDefault();
        const replicates = event.target[1].value;    
        const wells = stableWells.map(well => well.getLessShallowCopy())
        const targets = Array.from(document.getElementsByClassName("target")).map(input=>input.value);
        const reporters = Array.from(document.getElementsByClassName("reporter")).map(input=>input.value);

        wells.forEach(well => {
            well.targets = targets;
            well.reporters = reporters;
        })
        
        let emptyWells = [];
        switch (replicates){ //Make it so that empty wells can be redone if the user selects and submits duplicates and then later decides to do it in triplicates
            case "triplicates":
                emptyWells = wells.map(mutateTriplicates);
                wells.push(...emptyWells);
                break;
            case "duplicates":
                wells.forEach(well=>emptyWells.push(...mutateDuplicates(well)));
                wells.push(...emptyWells);
                break;
            default:
                console.log("Error, no replicate function available for selected replicates")
        }
        const results = [["[Sample Setup]"], "Well,Well Position,Sample Name,Sample Color,Biogroup Name,Biogroup Color,Target Name,Target Color,Task,Reporter,Quencher,Quantity,Comments".split(",")];
        const newFileName = selectedFile.name.replace(".csv", `-384WellTemplate-${replicates}-${++fileCount}.csv`);
        wells.forEach(well=>results.push(...well.get384WellArray()))
        sortResultsByWellPosition(results);
        diagram384Well(results, diagram384Container);
        const fileUrl = URL.createObjectURL(new File([Papa.unparse(results)], newFileName));
        addLink(fileUrl, downloadContainer, newFileName)
    })
}
/** 
*  @param {File} file
*  @returns {Promise<String>}
**/
function parseTemplateFile(file){
    return new Promise((resolve, reject)=>{
        Papa.parse(file, {complete:resolve, error:reject})
        
    })
}
/** 
*  @param {Object} results
*  @param {File} file
*  @returns {Promise}
**/
function get96WellTemplate(results, file){
    const {data, errors, meta} = results;
    return data.slice(2,10).map(innerArray=>innerArray.slice(1));
}


/** 
 *  @param {Number} well
 *  @param {String} sampleName
 *  @param {String} position96Well
 *  @param {Array<String>} targets
 *  @param {Array<String>} reporters
 *  @returns {Well}
**/
function wellFactory(well, sampleName, position96Well, targets, reporters){
    // const targets = Object.keys(targetsAndReporters).map(x=>x);
    // const reporters = Object.values(targetsAndReporters).map(x=>x);

    return {
        "well":0,
        "wellPosition":"",
        "sampleName":sampleName,
        "sampleColor":sampleName.toUpperCase() === "EMPTY"?'"""RGB(255,255,255)"""':"",
        "biogroupName":"",
        "biogroupColor":"",
        "targetName":"",
        "targetColor":"",
        "task":"",
        "reporter":"",
        "quencher":"",
        "quantity":"",
        "comments":"",
        "well96Number":well,
        "well96Position":position96Well,
        "well384Positions":[],
        "targets":targets,
        "reporters":reporters,
        "wellNumbers":[],
        get384WellArray(){
            const data = [];
            for(let j = 0; j < this["well384Positions"].length; j++){
                this["wellPosition"] = this["well384Positions"][j];
                for(let i = 0; i < this.targets.length;i++){
                    const values = Object.values(this).slice(0,13);
                    values[0] = this.wellNumbers[j];
                    values[6] = this.targets[i];
                    values[9] = this.reporters[i];
                    data.push(values);
                }
            }
            return data;
        },
        getLessShallowCopy(){
            const lessShallowCopy = {};
            for(let [key, val] of Object.entries(this)){
                if(Array.isArray(val)){
                    let arrayCopy = val.map(x=>x);
                    lessShallowCopy[key] = arrayCopy
                }
                else{
                    lessShallowCopy[key] = val;
                }
            }
            return lessShallowCopy
        },
    }
}

/** 
 *  @param {Array<Array<String>>} template
 *  @param {Array<String>} targets
 *  @param {Array<String>} reporters
 *  @returns {Array<Well>}
**/
function convertToWells(template){
    let wellNumber = 0;
    const wells = [];
    const wellColumn = 65; //Ascii value for 'A'
    for(let row = 0; row < template.length;row++){
        for(let column = 0; column < template[row].length;column++){
            let wellPosition = String.fromCharCode(wellColumn+row);
            wells.push(wellFactory(++wellNumber,template[row][column], `${wellPosition}${column+1}`, [], []))
        }
    }
    return wells;
}

/** 
 *  @param {Well} well
 *  @returns {Well}
**/
function mutateTriplicates(well){
    //Pushes to the 384WellPositions property the corresponding well positions for triplicates in the 384 well template
    //Returns an empty well in the position of the bottom-left
    const rowLetter = well.well96Position[0];
    const columnNumber = Number(well.well96Position.slice(1));
    const letters = [];
    const numbers = [];
    const A = 65; //Ascii value of 'A'
    const rowAscii = rowLetter.charCodeAt(0)
    const offset = rowAscii-A;
    const initial384Row = String.fromCharCode(rowAscii+offset);
    const end384Row = String.fromCharCode(rowAscii+offset+1);
    
    const endCol = columnNumber*2;
    const startCol = endCol-1;
    
    letters.push(initial384Row, initial384Row, end384Row);
    numbers.push(startCol, endCol, endCol);
    
    for(let i = 0; i < letters.length; i++){
        well.well384Positions.push(`${letters[i]}${numbers[i]}`);
        well.wellNumbers.push(((letters[i].charCodeAt(0)-A)*24)+numbers[i]); //The well number at 384 well plate
    }
    return createEmptyWell(`${end384Row}${startCol}`, well.targets, well.reporters)
}

/** 
 *  @param {Well} well
 *  @returns {Well}
**/
function mutateDuplicates(well){
    //Pushes to the 384WellPositions property the corresponding well positions for triplicates in the 384 well template
    //Returns an empty well in the position of the bottom-left
    const rowLetter = well.well96Position[0];
    const columnNumber = Number(well.well96Position.slice(1));
    const letters = [];
    const numbers = [];
    const A = 65; //Ascii value of 'A'
    const rowAscii = rowLetter.charCodeAt(0)
    const offset = rowAscii-A;
    const initial384Row = String.fromCharCode(rowAscii+offset);
    const end384Row = String.fromCharCode(rowAscii+offset+1);
    
    const endCol = columnNumber*2;
    const startCol = endCol-1;
    
    letters.push(initial384Row, initial384Row);
    numbers.push(startCol, endCol);
    
    for(let i = 0; i < letters.length; i++){
        well.well384Positions.push(`${letters[i]}${numbers[i]}`);
        well.wellNumbers.push(((letters[i].charCodeAt(0)-A)*24)+numbers[i]); //The well number at 384 well plate
    }
    return [createEmptyWell(`${end384Row}${startCol}`, well.targets, well.reporters), createEmptyWell(`${end384Row}${endCol}`, well.targets, well.reporters)]
}


/** 
 * @param {URL} link 
 * @param {Element} parent
 * @param {String} fileName
 * @returns {void}
**/
function addLink(link, parent, fileName){
    const anchorElement = document.createElement("a");
    anchorElement.href = link;
    anchorElement.download = fileName;
    anchorElement.textContent = fileName;
    parent.appendChild(anchorElement);
}

/** 
 * @param {String} position 
 * @param {Well} parent
 * @returns {Well}
**/
function createEmptyWell(position, targets, reporters){
    const emptyWell = {
        "well":"",
        "wellPosition":"",
        "sampleName":"EMPTY",
        "sampleColor":'"""RGB(255,255,255)"""',
        "biogroupName":"",
        "biogroupColor":"",
        "targetName":"",
        "targetColor":"",
        "task":"",
        "reporter":"",
        "quencher":"",
        "quantity":"",
        "comments":"",
        "well96Number":"",
        "well96Position":"A0",
        "well384Positions":[position],
        "targets":targets,
        "reporters":reporters,
        "wellNumbers":[],
        get384WellArray(){
            const data = [];
            for(let j = 0; j < this["well384Positions"].length; j++){
                this["wellPosition"] = this["well384Positions"][j];
                for(let i = 0; i < this.targets.length;i++){
                    const values = Object.values(this).slice(0,13);
                    values[0] = this.wellNumbers[j]?this.wellNumbers[j]:"";
                    values[6] = this.targets[i];
                    values[9] = this.reporters[i];
                    data.push(values);
                }
            }
            return data;
        },
        getLessShallowCopy(){
            const lessShallowCopy = {};
            for(let [key, val] of Object.entries(this)){
                if(Array.isArray(val)){
                    let arrayCopy = val.map(x=>x);
                    lessShallowCopy[key] = arrayCopy
                }
                else{
                    lessShallowCopy[key] = val;
                }
            }
            return lessShallowCopy
        },
    }
    return emptyWell;
}


/** 
 * @param {Array<Well>} wells
 * @param {Element} parent
 * @returns {void}
**/
function diagram96Well(wells, parent){
    for(let well of wells){
        const circularDiv = document.createElement("div");
        const wellPosition = document.createElement("p");
        wellPosition.textContent = well.well96Position;
        const hoverText = document.createElement("span");
        hoverText.textContent = well.sampleName;
        circularDiv.style.backgroundColor = well.sampleName.toUpperCase()==="EMPTY"?"white":"";
        hoverText.className = "hovertext"
        circularDiv.className = "well";
        circularDiv.appendChild(hoverText);
        circularDiv.appendChild(wellPosition)

        circularDiv.addEventListener("click", function (event){
            this.firstChild.style.visibility = "hidden";
            this.firstChild.nextSibling.style.visibility = "hidden"; 
            const sampleNameInput = document.createElement("input");
            this.appendChild(sampleNameInput);
            sampleNameInput.style.zIndex = "1";
            this.lastChild.focus();
            
            sampleNameInput.addEventListener("change", event=>{
                
                well.sampleName = sampleNameInput.value;
                well.sampleColor = sampleNameInput.value.toUpperCase() === "EMPTY"?'"""RGB(255,255,255)"""':"";
                hoverText.textContent = sampleNameInput.value;
                
                
                this.firstChild.style.visibility = "";
                this.firstChild.nextSibling.style.visibility = ""; 
                console.log(this)
                this.style.backgroundColor = sampleNameInput.value.toUpperCase() === "EMPTY"?"white":"";
                try {
                    this.removeChild(this.lastChild);
                } catch (error) {
                    ""
                }
                
            })

            sampleNameInput.addEventListener("focusout", event=>{
                this.removeChild(this.lastChild);
                this.firstChild.style.visibility = "";             
                this.firstChild.nextSibling.style.visibility = "";  
                
            })
            
        })
        
        parent.appendChild(circularDiv);
    }
}

/** 
 * @param {Array<Array<String>>} results
 * @param {Element} parent
 * @returns {void}
**/
function diagram384Well(results, parent){
    while (parent.children.length !== 0) parent.removeChild(parent.firstChild);
    for (let i = 2; i < results.length; i++){
        
        const circularDiv = document.createElement("div");
        const wellPosition = document.createElement("p");
        wellPosition.textContent = results[i][1];
        const hoverText = document.createElement("span");
        hoverText.textContent = results[i][2];
        circularDiv.style.backgroundColor = results[i][2].toUpperCase()==="EMPTY"?"white":"";
        hoverText.className = "hovertext"
        circularDiv.className = "well";
        circularDiv.appendChild(hoverText);
        circularDiv.appendChild(wellPosition);
        parent.appendChild(circularDiv);
    }
}

/** 
 * @param {Event} event
 * @returns {void}
**/
function addTargetReporterInput(event){
    event.preventDefault();
    const targetInput = document.createElement("input");
    const reporterInput = document.createElement("input");
    targetInput.className = "target";
    reporterInput.className = "reporter";
    document.getElementById("reporters").appendChild(reporterInput);
    document.getElementById("targets").appendChild(targetInput);
}

/** 
 * @param {Event} event
 * @returns {void}
**/
function removeTargetReporterInput(event){
    event.preventDefault();
    
    const reporters = document.getElementById("reporters");
    const targets = document.getElementById("targets");
    if (reporters.children.length > 2 && targets.children.length > 2){
        reporters.removeChild(reporters.lastChild);
        targets.removeChild(targets.lastChild);
    }
}

/** 
 * @param {Array<Array<String>>} results
 * @returns {void}
**/
function sortResultsByWellPosition(results){
    //Sorts array of strings in place by order A1, A2, A3,...A24, B1, B2, B3, etc
    return results.sort((well1, well2)=>{
        if(well1.length < 13 || well2.length < 13) return 0;
        if(well1[1] === "Well Position" || well2[1] === "Well Position") return 0;
        if(well1[1].charCodeAt(0) - well2[1].charCodeAt(0) === 0){
            return parseInt(well1[1].slice(1)) - parseInt(well2[1].slice(1));
        }
        return well1[1].charCodeAt(0) - well2[1].charCodeAt(0);
    })
}

main()