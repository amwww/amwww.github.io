var clicked =0;
document.getElementById("1").onclick = function() {
    clicked +=1
    document.getElementById("2").innerText="times clicked " + clicked
};

