let defaultQubits=2; 
let canAddDeleteQubits=true;
let canEdit=true;
let allowedGates=['H','X','Y','Z','C','N','P','T','I','m'];
// let startCircuit="HHHI,IIIX,IIIH,IIII,CCCN,IIII,IIIH,IIIX,HHHI,XXXI,IIHI,CCNI,IIHI,XXXI,HHHI,IIIX,IIIH,IIII,CCCN,IIII,IIIH,IIIX,HHHI,XXXI,IIHI,CCNI,IIHI,XXXI,HHHI";
let startCircuit = "HI,CN"

let config = `[
  {
    "defaultQubits": ${defaultQubits},
    "canAddDeleteQubits": ${canAddDeleteQubits},
    "canEdit": ${canEdit},
    "allowedGates": "${allowedGates}",
    "startCircuit": "${startCircuit}"
  }
]`;
let configurations = JSON.parse(config);

let qubitCount = 0;

// Full list of gates supported in Circuit Builder
const GATES = ['H', 'X', 'Y', 'Z', 'C', 'N', 'P', 'T', 'I', 'm'];

// Gates recognised for vertical connection to control 'C' gate
const CONTROLLED_GATES = ['X', 'Y', 'Z', 'P', 'T', 'N'];

const gatePalette = document.getElementById('gatePalette');
const circuit = document.getElementById('circuit');
let draggedGate = null;
let quic;
let numQubits;
let preGates;
let oracle;
const maxGates = 13;

function getPreGates() {
    preGates = '';
    let allGates = document.querySelectorAll('.qubit-line .circuit-gate');
    for (gate of allGates) {
        if (gate.classList.contains('red-border')) {
            continue; 
        }
        preGates += gate.textContent; 
    } 
    preGates = preGates + ',';
    
    return preGates;
}

function getOracleGates() {
    let oracle = ''; 
    // get all oracle gates
    oracleGates = document.querySelectorAll('.qubit-line .red-border');

    // display gates in oracle input
    for(gate of oracleGates) {     
        oracle += gate.textContent;
    }
    // if there are oracle gates, add a comma
    if(oracle.length > 0) {
        oracle = oracle + ',';
    } 
    
    return oracle;
}

function generateQibo() {
    numQubits = document.querySelectorAll('.qubit-line').length;
    resultstate = Module.ccall('QuICScript_Qibo', 'string', ['number', 'string', 'number', 'number', 'number'], [numQubits, quic, 0,0,0]);
    // status generates the result in chrome dev tools console
    document.getElementById('qiboDisplay').innerHTML= "<textarea readonly >" + resultstate + "</textarea>";
}

function runQuICScript() {
    // console.log("Number of Qubits: ", numQubits); 
    // console.log("Quicscript string: ", quic);
    numQubits = document.querySelectorAll('.qubit-line').length;
    document.getElementById('quicDisplay').innerHTML = '';
    // if running for the first time
    if(!inited) {
        Module._QuICScript_begin(numQubits);
        inited = numQubits;
        message = "State is reset, working on " + numQubits + " Qubits\n";
    }
    // for subsequent runs
    else {
        if(inited != numQubits) {
            Module._QuICScript_end();
            Module._QuICScript_begin(numQubits);
            inited = numQubits;
            message = "State is reset, working on " + numQubits + " Qubits\n";
        }
    }
    resultstate = Module.ccall('QuICScript_cont', 'string', ['number', 'string', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'], [numQubits, quic, 1,0,0,0,0,0,1,0]);
    message = resultstate + "---\n" + message;
    document.getElementById('quicDisplay').innerHTML = "<textarea readonly >" + message + "</textarea>";
}

function runCircuitFromString(circuitString) {
    // Clear existing circuit first
    document.getElementById('refresh').click();

    const steps = circuitString.split(',');
    const qubitCount = steps[0].length; // Determine the number of qubits based on the first step

    // Ensure there are enough qubits
    while (qubitCount > document.querySelectorAll('.qubit-line').length) {
        addQubit();
    }

    // Iterate over each step to place gates
    steps.reverse().forEach((step, stepIndex) => {
        step.split('').forEach((gate, qubitIndex) => {
            
            const qubitLine = document.querySelector(`.qubit-line[data-qubit="${qubitIndex}"]`);
            placeGate(qubitLine, gate, stepIndex + 2); // +2 to account for qubit label and wire
            adjustGatesInQubitLine(qubitLine);
        
        });
    });

    function placeGate(qubitLine, gateType) {
        const gate = document.createElement('div');
        gate.textContent = gateType;
        if (gateType === 'I') {
                    // hide gate if it's an identity gate
                    gate.style.visibility = 'hidden';
                }
        gate.classList.add('gate', 'circuit-gate');
        gate.setAttribute('draggable', 'true');
        gate.addEventListener('dragstart', dragStart);
        gate.addEventListener('dragend', dragEnd);
        // Insert the new gate right after the qubit label, which is the first child
        const insertPosition = findInsertPosition(qubitLine);
        qubitLine.insertBefore(gate, insertPosition);
    }

    function findInsertPosition(qubitLine) {
        // Find the position where the new gate should be inserted. This logic ensures that gates
        // added through the Run button are placed at the correct position within the qubit line.
        const children = Array.from(qubitLine.children);
        let insertAfterLabel = qubitLine.firstChild; // Start with the label
        for (let child of children) {
            if (child.classList.contains('gate')) {
                insertAfterLabel = child;
            } else {
                break; // Stop once the first gate is found
            }
        }
        return insertAfterLabel ? insertAfterLabel.nextSibling : qubitLine.firstChild.nextSibling;
    }

    drawControlLines();

    
}

function clearControlLines() {
    document.querySelectorAll('.control-line').forEach(line => line.remove());
}    


// Function to add a qubit line to the circuit
function addQubit() {
    if (qubitCount < 9) {
        const qubitLine = document.createElement('div');
        qubitLine.classList.add('qubit-line');
        qubitLine.setAttribute('data-qubit', qubitCount);
        qubitLine.addEventListener('dragover', allowDrop);
        qubitLine.addEventListener('drop', drop);
        
        // Create and append the label
        const label = document.createElement('span');
        label.classList.add('qubit-label');
        label.textContent = `q[${qubitCount}]: `;
        qubitLine.appendChild(label);

        for (let i = 0; i < maxGates; i++) {
            qubitLine.appendChild(createInvisibleGate()); // This will insert invisible gates right after the label
        }
        
        // Create and append the wire element
        const wire = document.createElement('div');
        wire.classList.add('qubit-wire');
        qubitLine.appendChild(wire);
        
        circuit.appendChild(qubitLine);
        qubitCount++;
        if (canAddDeleteQubits && canEdit) {
            const removeButton = document.createElement('button');
            removeButton.textContent = 'x';
            removeButton.classList.add('remove-qubit');
            removeButton.onclick = removeQubit; // Attach the remove function
            qubitLine.appendChild(removeButton);
        }
    } 
    drawControlLines();
}

function addSingleQubit() {
    if (qubitCount < 9) {
        addQubit(); // This function should only add a single qubit line to the circuit
        drawControlLines();
    } else {
        alert('Maximum number of qubits reached.');
    }
}

function createInvisibleGate() {
    const invisibleGate = document.createElement('div');
    invisibleGate.classList.add('gate', 'invisible-gate');
    invisibleGate.setAttribute('draggable', 'true');
    invisibleGate.addEventListener('dragstart', dragStart);
    invisibleGate.addEventListener('dragend', dragEnd);
    if(hideGrids.checked) {
        invisibleGate.style.border = 'none';
    }
    return invisibleGate;
}

function removeQubit(ev) {
    clearControlLines();
    const qubitLine = ev.target.parentNode;
    qubitLine.parentNode.removeChild(qubitLine);
    // Update the qubit count
    qubitCount--;
    // Update qubit labels
    updateQubitLabels();
    drawControlLines();
}

function updateQubitLabels() {
    const qubitLines = document.querySelectorAll('.qubit-line');
    qubitLines.forEach((line, index) => {
        const label = line.querySelector('.qubit-label');
        label.textContent = `q[${index}]: `;
    });
}

// Function to allow drop
function allowDrop(ev) {
    ev.preventDefault();
}

// Function to handle drag start
function dragStart(ev) {
    if (!canEdit) {
        ev.preventDefault();
        return; // Prevent dragging when canEdit is false
    }
    // Set the data to the type of gate instead of the element ID
    ev.dataTransfer.setData("text/plain", ev.target.textContent);
    ev.target.classList.add('dragging');
    draggedGate = ev.target;
    
    // Check if the dragged gate is from the palette or from the circuit
    if (!ev.target.classList.contains('palette-gate')) {
        // The gate is from the circuit, set a flag in the dataTransfer object
        ev.dataTransfer.setData("fromCircuit", "true");
    }
}


    // Function to handle drag end
function dragEnd(ev) {
    // Check if the dragged gate is from the palette or from the circuit
    const fromCircuit = ev.dataTransfer.getData("fromCircuit") === "true";
    // If the gate is from the circuit and it's outside the circuit, remove it
    if (fromCircuit) {
        ev.target.remove();
    }
    // Remove the dragging class from the original element in the palette
    ev.target.classList.remove('dragging');
}

    // Function to handle drop
function drop(ev) {
    ev.preventDefault();
    const gateType = ev.dataTransfer.getData("text/plain");
    const fromCircuit = ev.dataTransfer.getData("fromCircuit") === "true";
    let originalQubitLine = draggedGate ? draggedGate.closest('.qubit-line') : null; // Get original qubit line if gate is moved within the circuit
    clearControlLines();
    let gate;
    if (!fromCircuit) {
        // Create a new gate if it's dragged from the palette
        gate = document.createElement('div');
        gate.textContent = gateType;
         if(gateType === 'I') {
            // hide gate if it's an identity gate
            gate.style.visibility = 'hidden';
        }
        gate.classList.add('gate', 'circuit-gate');
        gate.setAttribute('draggable', 'true');
        gate.addEventListener('dragstart', dragStart);
        gate.addEventListener('dragend', dragEnd);
    } else if (draggedGate) {
        // If the gate is dragged from the circuit, use it directly
        gate = draggedGate;
    }
    
    let dropTarget = ev.target;
    let targetQubitLine;
    if (dropTarget.classList.contains('gate')) {
    // Dropping on another gate - replace it with the new/dragged gate
        const parentLine = dropTarget.parentNode;
        parentLine.replaceChild(gate, dropTarget);
        targetQubitLine = parentLine.closest('.qubit-line');
    } else {
        // Normal placement or repositioning logic
        placeGate(dropTarget, gate, ev.clientX);
        const targetQubitLine = dropTarget.closest('.qubit-line') || dropTarget;
        adjustGatesInQubitLine(targetQubitLine);
    }

    if (originalQubitLine) adjustGatesInQubitLine(originalQubitLine); // Adjust gates in the original line if a gate was moved
    adjustGatesInQubitLine(targetQubitLine);
    
    drawControlLines();
    // Reset dragged gate reference after drop
    draggedGate = null;
}

function adjustGatesInQubitLine(qubitLine) {
    const currentGates = qubitLine.querySelectorAll('.gate').length; // includes invisible gates
    const gatesNeeded = maxGates - currentGates;
    
    if (gatesNeeded > 0) {
        for (let i = 0; i < gatesNeeded; i++) {
            const removeButton = qubitLine.querySelector('.remove-qubit');
            qubitLine.insertBefore(createInvisibleGate(), removeButton); // add invisible gates if needed
        }
    } else if (gatesNeeded < 0) {
        // remove extra gates starting from the right
        Array.from(qubitLine.querySelectorAll('.gate'))
            .slice(gatesNeeded) // gets the last few gates equal to the excess amount
            .forEach(gate => gate.remove());
    }
}

function placeGate(dropTarget, gate, dropX) {
    dropTarget = dropTarget.closest('.qubit-line') || dropTarget;
    if (dropTarget.classList.contains('qubit-line')) {
        const qubitRect = dropTarget.getBoundingClientRect();
        const dropPositionX = dropX - qubitRect.left;
        let insertAfterElement = null;
        const children = Array.from(dropTarget.children);
        // Adjust drop position if there is a separator
        const adjustedDropPositionX = dropPositionX;
    
        for (let child of children) {
            if (child.classList.contains('gate')) {
                const childRect = child.getBoundingClientRect();
                const childCenterX = childRect.left + childRect.width / 2 - qubitRect.left;
                if (adjustedDropPositionX > childCenterX) {
                    insertAfterElement = child;
                } else {
                    // If dropping onto an existing gate, replace it
                    if (dropPositionX >= childRect.left - qubitRect.left && dropPositionX <= childRect.right - qubitRect.left) {
                        dropTarget.replaceChild(gate, child);
                        return; // Exit the function after replacing the gate
                    }
                    break;
                
                }
            }
        }
    
        // Place the gate at the adjusted position if there's no gate to replace
        if (insertAfterElement) {
            insertAfterElement.parentNode.insertBefore(gate, insertAfterElement.nextSibling);
        } else {
            // Append at the beginning if no gates are present or the position is at the start
            const qubitLabel = dropTarget.querySelector('.qubit-label');
            if (qubitLabel) {
            // If there's a label, insert after the label
                dropTarget.insertBefore(gate, qubitLabel.nextSibling);
            } else {
                // If no label, append as the first child
                dropTarget.insertBefore(gate, dropTarget.firstChild);
            }
        }
    }
}

// Function to generate QUIC
function generateQuic() {
    const qubitLines = document.querySelectorAll('.qubit-line');
    const depthGates = [];
    let maxDepth = 0;

    // Find the maximum depth
    qubitLines.forEach(line => {
        maxDepth = Math.max(maxDepth, line.children.length - 3); // -1 to exclude the qubit label
    });

    // Initialize depthGates with 'I'
    for (let i = 0; i < maxDepth; i++) {
        depthGates[i] = Array(qubitLines.length).fill('I');
    }

    // Populate depthGates with actual gates
    qubitLines.forEach((line, qubitIndex) => {
        line.querySelectorAll('.gate').forEach((gate, gateIndex) => {
            depthGates[gateIndex][qubitIndex] = gate.textContent;
        });
    });

    // to be used for Grover circuit
    // preGates = getPreGates();
    // oracle = getOracleGates();
     
    // Join the gates with commas and create the QUIC string
    quic = depthGates.map(depth => depth.join('')).join(',');
    quic = depthGates.map(depth => {
        // Filter out undefined or empty entries before joining
        return depth.filter(gate => gate).join('');
    }).filter(entry => entry !== '').join(',');
    quic = quic + ".";
    
    // Output the QUIC (here we simply log it to the console, you can change this to display it on the page)
    // console.log(quic);

    // display pre circuit in input field
    document.querySelector('#circuitInput').value = quic;
    // to be used for grover circuit
    // document.querySelector('#oracleInput').value = oracle;
  

    // // Optionally, output to the page
    // const quicDisplay = document.getElementById('quicDisplay');
    // if (!quicDisplay) {
    //     const display = document.createElement('div');
    //     display.id = 'quicDisplay';
    //     display.textContent = quic;
    //     document.body.appendChild(display);
    // } else {
    //     quicDisplay.textContent = quic;
    //     // bubble_fn_quic(quic);
    // }
}

function drawControlLines() {
    // Clear any existing control lines
    // Modify this part in the drawControlLines function:
    document.querySelectorAll('.gate.red-border').forEach(gate => gate.classList.remove('red-border'));

    // Iterate over each depth (column) to find connections and draw lines
    const maxDepth = findMaxDepth();
    for (let depth = 0; depth <= maxDepth; depth++) {
        let controlGateElements = [];
        const targetGatesElements = [];

        // Find control gate 'C' and target gates 'X', 'Y', 'Z' at this depth in the circuit
        circuit.querySelectorAll(`.qubit-line .gate:nth-child(${depth + 2})`).forEach(gate => {
            if (gate.textContent === 'C') {
                controlGateElements.push(gate);
            } else if (CONTROLLED_GATES.includes(gate.textContent)) {
                targetGatesElements.push(gate);
            }
        });

        // Only draw lines and add red borders if there is a control and at least one target gate
        if (controlGateElements.length > 0 && (targetGatesElements.length > 0 || controlGateElements.length > 1)) {
            controlGateElements.forEach(controlGate => {
                controlGate.classList.add('red-border');
                targetGatesElements.forEach(targetGate => {
                    // Draw line between control and target gate
                    drawLine(controlGate, targetGate);
                    // Add red border to target gate
                    targetGate.classList.add('red-border');
                });
                // Draw line between control gates
                for (let i = 0; i < controlGateElements.length - 1; i++) {
                    drawLine(controlGateElements[i], controlGateElements[i + 1]);
                }
            });
        }
    }

}


function findMaxDepth() {
    return Array.from(document.querySelectorAll('.qubit-line'))
        .reduce((max, line) => Math.max(max, line.querySelectorAll('.gate').length), 0);
}

function drawLine(fromElement, toElement) {
    // Calculate the top and bottom positions of the gates
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();

    // Determine the starting and ending Y positions of the line
    const startY = Math.min(fromRect.bottom, toRect.bottom);
    const endY = Math.max(fromRect.top, toRect.top);

    // Create the line element
    const line = document.createElement('div');
    line.classList.add('control-line');
    
    // Set the position and style of the line
    line.style.position = 'absolute';
    line.style.left = `${fromRect.left + (fromRect.width / 2) - 1}px`; // Center the line on the gate
    line.style.top = `${startY}px`; // Start from the bottom of the 'C' gate
    line.style.width = '2px';
    line.style.height = `${endY - startY}px`; // The height should be the difference between the endY and startY
    line.style.backgroundColor = 'grey';
    
    // Add the line to the body of the document or to a specific container if required
    document.body.appendChild(line);
}


document.addEventListener('DOMContentLoaded', function() {

    //document.getElementById('app').style.display = 'none';

    

    const configBoxesContainer = document.getElementById('configBoxes');
    const gatePalette = document.getElementById('gatePalette');
    const circuit = document.getElementById('circuit');

    


    // Function to create and append configuration boxes
    function createConfigBoxes() {
        configurations.forEach((configuration,index) => {
            const box = document.createElement('div');
            box.classList.add('config-box'); // Assuming you have some CSS for this
            box.textContent = configuration.startCircuit;
            box.setAttribute('data-index', index);
            configBoxesContainer.appendChild(box);
        });
    }

    function resetAndInitializeEnvironment(configuration) {
        // Clear gate palette and circuit
        gatePalette.innerHTML = '';
        circuit.innerHTML = '';
        qubitCount = 0;
    
        // Hide Add/Delete Qubit button based on configuration
        document.getElementById('addQubit').style.display = configuration.canAddDeleteQubits ? '' : 'none';
    
        // Add initial qubits based on configuration
        for (let i = 0; i < configuration.defaultQubits; i++) {
          addQubit();
        }
    
        // Optionally, initialize circuit with a start circuit
        if (configuration.startCircuit) {
          runCircuitFromString(configuration.startCircuit);
        }
        if(canEdit) {
          document.getElementById('gatePalette').style.display = '';
          document.getElementById('circuitContainer').style.marginLeft = '';
          document.getElementById('addQubit').style.display = '';
        }
         
        for (let i = qubitCount; i < defaultQubits; i++) {
            addQubit();
        }
      } // end resetAndInitializeEnvironment

    // Create boxes based on configurations
    createConfigBoxes();

    setTimeout(() => {
        const firstConfigBox = document.querySelector('.config-box');
        if (firstConfigBox) {
            firstConfigBox.click();
            firstConfigBox.click();
            
        }
    }, 0);

    configBoxesContainer.addEventListener('click', function (event) {
        if (event.target.classList.contains('config-box')) {
            const index = event.target.getAttribute('data-index');
            let configuration = configurations[index];

            defaultQubits = configuration.defaultQubits; 
            canAddDeleteQubits = configuration.canAddDeleteQubits;
            canEdit = configuration.canEdit;
            allowedGates = configuration.allowedGates;
            startCircuit = configuration.startCircuit;
            resetAndInitializeEnvironment(configuration);
            document.getElementById('app').style.display = 'block';

    // Add gates to the palette
    GATES.forEach(function(gate, index) {
        if (allowedGates.includes(gate)) {
            const gateElement = document.createElement('div');
            gateElement.textContent = gate;
            gateElement.classList.add('gate', 'palette-gate');
            gateElement.setAttribute('draggable', 'true');
            gateElement.setAttribute('id', `gate-${index}`);
            gateElement.addEventListener('dragstart', dragStart);
            gateElement.addEventListener('dragend', dragEnd);
            gatePalette.appendChild(gateElement);
        }
    });
    
document.getElementById('addQubit').style.display = canAddDeleteQubits ? '' : 'none';
document.getElementById('generateQuic').addEventListener('click', generateQuic);
document.getElementById('generateQibo').addEventListener('click', generateQibo);

if(!canEdit) {
    document.getElementById('gatePalette').style.display = 'none';
    document.getElementById('circuitContainer').style.marginLeft = '125px';
    document.getElementById('addQubit').style.display = 'none';
}
    drawControlLines();

    // Add event listener for the 'Add Qubit' button
    document.getElementById('addQubit').addEventListener('click', addSingleQubit);
    document.getElementById('circuit').addEventListener('dragover', function(ev) {
        ev.preventDefault();
    });
    document.addEventListener('drop', function(ev) {
        ev.preventDefault();
        // Check if the drop event occurred outside the "circuitContainer" element
        if (draggedGate && ev.target.id !== 'circuit' && !ev.target.closest('#circuit')) {
            draggedGate.parentNode.removeChild(draggedGate);
            draggedGate = null;
        }
    });

    document.getElementById('runCircuit').addEventListener('click', function () {
        // const circuitString = document.getElementById('circuitInput').value;
        // runCircuitFromString(circuitString);
        runQuICScript();

    });
    
    document.getElementById('refresh').addEventListener('click', function () {
        // Remove all qubit lines
        const qubitLines = document.querySelectorAll('.qubit-line');
        qubitLines.forEach((line) => {
            line.parentNode.removeChild(line);
        });
    
        const controlLines = document.querySelectorAll('.control-line');
        controlLines.forEach((line) => {
            line.remove(); // This removes the control lines from the DOM
        });

        const separatorLines = document.querySelectorAll('.circuit-separator');
        separatorLines.forEach((line) => {
            line.remove(); // This removes the separator lines from the DOM
        });

        // Reset qubit count
        qubitCount = 0;
    
        // Add one default qubit line
        addQubit();
        
        document.getElementById('quicDisplay').innerHTML = '';
    });

    const hideGridsCheckbox = document.getElementById('hideGrids');

    hideGridsCheckbox.addEventListener('change', function() {
        const invisibleGates = document.querySelectorAll('.invisible-gate');
        invisibleGates.forEach(gate => {
            if (this.checked) {
                gate.style.border = 'none';
            } else {
                gate.style.border = '1px dashed #d1d5db';
            }
        });
    });

}
    });
});
