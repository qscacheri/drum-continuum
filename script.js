const sequencer = new Sequencer('sequencerContainer')
document.getElementById('playButton').addEventListener('click', (e) => {
    console.log(e.target.innerHTML);
    
    if (e.target.innerHTML === 'play') {
        sequencer.play()
        e.target.innerHTML = 'stop'
    }
    else {
        sequencer.stop()
        e.target.innerHTML = 'play'
    }

})

document.getElementById('extendButton').addEventListener('click', () => {
    sequencer.extend()
})

document.getElementById('temperatureSlider').addEventListener('change', (e) => {
    console.log(e.target.value);

    sequencer.temperature = e.target.value;
})


