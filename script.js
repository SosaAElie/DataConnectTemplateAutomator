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
 */


function main(){
    const fileSubmitForm = document.getElementById("select-files");
    const downloadContainer = document.getElementById("download-container");
    const diagramContainer = document.getElementById("Well96-diagram");
    const make384TemplateButton = document.getElementById("make384Template");
    let fileCount = 0;
    fileSubmitForm.addEventListener("submit", event =>{
        event.preventDefault();
        const fileInput = event.target[0].files[0];
        const replicates = event.target[1].value.toString();    
        let emptyWells = [];
        parseTemplateFile(fileInput).then(parsedCsv=>{
            const template = get96WellTemplate(parsedCsv);
            const wells = convertToWells(template);
            diagram96Well(wells, diagramContainer);
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
            make384TemplateButton.addEventListener("click", event => {
                const results = [["[Sample Setup]"], "Well,Well Position,Sample Name,Sample Color,Biogroup Name,Biogroup Color,Target Name,Target Color,Task,Reporter,Quencher,Quantity,Comments".split(",")];
                const newFileName = fileInput.name.replace(".csv", `-384WellFileNumber${++fileCount}.csv`);
                wells.forEach(well=>results.push(...well.get384WellArray()))
                const fileUrl = URL.createObjectURL(new File([Papa.unparse(results)], newFileName));
                addLink(fileUrl, downloadContainer, newFileName)
            })
            
        })
    })
}




/** 
*  @param {File} file
*  @returns {Promise<String>}
**/
function parseTemplateFile(file){
    return new Promise((resolve, reject)=>{
        Papa.parse(file, {complete:resolve})
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
 *  @param {Object} targetsAndReporters
 *  @returns {Well}
**/
function wellFactory(well, sampleName, position96Well, targetsAndReporters){
    const targets = Object.keys(targetsAndReporters).map(x=>x);
    const reporters = Object.values(targetsAndReporters).map(x=>x);
    return {
        "well":0,
        "wellPosition":"",
        "sampleName":sampleName,
        "sampleColor":"",
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
        }
    }
}

/** 
 *  @param {Array<Array<String>>} template
 *  @returns {Array<Well>}
**/
function convertToWells(template){
    let wellNumber = 0;
    const wells = [];
    const wellColumn = 65; //Ascii value for 'A'
    const targetsReporters = { //Grabbed from test 384 template
        "CT/UP":"VIC",
        "IC":"ROX",
        "MG/TV":"QUASAR 705",
        "NG/TP":"FAM",
        "UU/MH":"CY5"
    }
    for(let row = 0; row < template.length;row++){
        for(let column = 0; column < template[row].length;column++){
            let wellPosition = String.fromCharCode(wellColumn+row);
            wells.push(wellFactory(++wellNumber,template[row][column], `${wellPosition}${column+1}`, targetsReporters))
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
    anchorElement.text = fileName;
    parent.appendChild(anchorElement);
}

/** 
 * @param {String} position 
 * @param {Well} parent
 * @returns {Well}
**/
function createEmptyWell(position, targets, reporters){
    const emptyWell = {
        "well":0,
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
        "well96Number":0,
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
                    values[0] = this.wellNumbers[j];
                    values[6] = this.targets[i];
                    values[9] = this.reporters[i];
                    data.push(values);
                }
            }
            return data;
        }
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
        hoverText.className = "hovertext"
        circularDiv.className = "well";
        circularDiv.appendChild(hoverText);
        circularDiv.appendChild(wellPosition)
        circularDiv.addEventListener("click", function (event){
            this.firstChild.style.visibility = "hidden";
            const sampleNameInput = document.createElement("input");
            this.appendChild(sampleNameInput);
            sampleNameInput.style.zIndex = "1";
            this.lastChild.focus();
            
            sampleNameInput.addEventListener("change", event=>{
                
                this.firstChild.style.visibility = "";
                well.sampleName = sampleNameInput.value;
                hoverText.textContent = sampleNameInput.value;
                this.removeChild(sampleNameInput);
            })

            sampleNameInput.addEventListener("focusout", event=>{
                this.removeChild(sampleNameInput);
                this.firstChild.style.visibility = "";                
            })
            
        })
        
        parent.appendChild(circularDiv);
    }
}

main()