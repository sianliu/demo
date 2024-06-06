/*
PURPOSE: designed to interpret and execute a quantum circuit from a file.

RECEIVES: 
@QuICScriptfile, string representing the path to the QuICScript file.

RETURNS: @outString contains the result of the quantum circuit. 
*/
QuICScript_file

/*
PURPOSE: cleanup function that ensures the resources managed by qList are properly freed and that qList is reset to a safe state (NULL).

RECEIVES: None

RETURNS: None 
*/
QuICScript_clearbuf

/*
PURPOSE: sets the initial state of a quantum circuit

RECEIVES: 
@numQubits represents the number of qubits.
@Value, an unsigned long integer that represents the initial state.
@Count, a double precision floating-point number, contains the probabilities. 

RETURNS: @outString1 contains result 
*/
QuICScript_setState
           
/*
PURPOSE: setup function, initialize quantum circuit with specified number of qubits.

RECEIVES: @numQubits, number of qubits.

RETURNS: @outString1, stores result.
*/
QuICScript_begin

/*
PURPOSE: runs a quantum circuit 

RECEIVES: 
@numQubits, number of qubits. 
@myQuICScript, QuICScript string
@X1_real, 
@X1_imag, 
@Y1_real, 
@Y1_imag, 
@X2_real, 
@X2_imag, 
@Y2_real, 
@Y2_imag
A series of real and imaginary numbers representing state of qubits. 

RETURNS: @outstring1 contains the quantum state. 
*/
QuICScript_cont

/*
PURPOSE: cleanup function that deallocates resources associated with qList1 and resets its pointer to prevent misuse

RECEIVES: None

RETURNS: None
*/
QuICScript_end 

/*
PURPOSE: generate a Python script for quantum circuit simulation using the Qibo framework

RECEIVES: 
@numQubits, number of qubits in the quantum circuit. 
@myQuICScript QuICScript quantum circuit 
@theta,
@phi, 
@lamda 
are the unitary gate parameters 

RETURNS: @outQiboString, contains the generated Python script.
*/
QuICScript_Qibo
