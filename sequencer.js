const numVoices = 5
const numBeats = 32
const midiNotes = [36, 38, 42, 46, 49]
const drumVoices = { 36: 0, 38: 1, 42: 2, 46: 3, 49: 4}
const beatTime = .5
class Sequencer {
    constructor(containerElementID) {
        this.container = document.getElementById(containerElementID)
        this.createSequencer()
        this.noteSequence = { notes: [] }
        const baseUrl = 'https://storage.googleapis.com/magentadata/js/soundfonts/';

        this.player = new mm.SoundFontPlayer(baseUrl + 'jazz_kit')
        this.lastBeat = 0
        this.isPlaying = false
        this.rnn = new mm.MusicRNN(
            'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/drum_kit_rnn'
        );
        this.rnn.initialize()
        this.temperature = .2
        this.currentBeat = 0
        this.samplerLoaded = false
        this.sampler = new Tone.Sampler({
            'C3': './samples/kick.wav',
            'D3': './samples/snare.wav',
            'F#3': './samples/closed.wav',
            'A#3': './samples/open.wav',
            'C#4': './samples/crash.wav'
        })
        this.sampler.toMaster()

        Tone.Transport.scheduleRepeat(() => {
            for (let i = 0; i < this.noteSequence.notes.length; i++) {
                let currentNote = this.noteSequence.notes[i]
                let id = drumVoices[currentNote.pitch] + ':' + currentNote.quantizedStartStep
                if (currentNote.quantizedStartStep === this.currentBeat) {
                    console.log(currentNote.pitch);
                    document.getElementById(id).className = 'sequencer-button playing'
                    this.sampler.triggerAttackRelease(Tone.Frequency(currentNote.pitch + 12, "midi").toNote());
                }
                else {
                    document.getElementById(id).className = 'sequencer-button active'
                }
            }
            this.currentBeat++;
            this.currentBeat = this.currentBeat % 32
        }, "16n", "1m");

    }

    play() {
        if (Tone.context.status != 'running') Tone.context.resume()
        Tone.Transport.start()
    }

    stop() {
        Tone.Transport.stop()
    }


    async extend() {
        Tone.Transport.stop()
        const seq = this.quantize(this.noteSequence, this.getLastBeat() / 2)

        for (let i = 0; i < this.noteSequence.notes.length; i++) {
            if (this.noteSequence.notes[i].quantizedStartStep > this.lastBeat)
                this.lastBeat = this.noteSequence.notes[i].quantizedStartStep
        }
        const r = await this.rnn.continueSequence(seq, numBeats - this.getLastBeat(), this.temperature)
        const lastBeat = this.getLastBeat()
        for (let i = 0; i < r.notes.length; i++) {
            r.notes[i].quantizedStartStep += lastBeat
            r.notes[i].quantizedEndStep += lastBeat
            r.notes[i].startTime = r.notes[i].quantizedStartStep * beatTime
            r.notes[i].endTime = r.notes[i].quantizedEndStep * beatTime
        }

        this.noteSequence.notes = [...this.noteSequence.notes, ...r.notes]
        this.updateUI()
        return r;
    }

    updateUI() {
        for (let i = 0; i < this.noteSequence.notes.length; i++) {
            let currentNote = this.noteSequence.notes[i]
            let id = drumVoices[currentNote.pitch] + ':' + currentNote.quantizedStartStep
            document.getElementById(id).className = 'sequencer-button active'
        }
    }

    getLastBeat() {
        let lastBeat = 0
        for (let i = 0; i < this.noteSequence.notes.length; i++) {
            let currentNote = this.noteSequence.notes[i]
            if (currentNote.quantizedStartStep > lastBeat) lastBeat = currentNote.quantizedStartStep
        }
        return lastBeat
    }

    quantize(sequence, length) {
        return mm.sequences.quantizeNoteSequence(
            {
                ticksPerQuarter: 220,
                totalTime: length,
                timeSignatures: [
                    {
                        time: 0,
                        numerator: 4,
                        denominator: 4
                    }
                ],
                tempos: [
                    {
                        time: 0,
                        qpm: 120
                    }
                ],
                notes: [...sequence.notes]
            },
            1
        );
    }

    handleClick(e, info) {
        let pitch = midiNotes[info.part]
        for (let i = 0; i < this.noteSequence.notes.length; i++) {
            if (this.noteSequence.notes[i].pitch === pitch && this.noteSequence.notes[i].quantizedStartStep === info.beat) {
                this.noteSequence.notes.splice(i, 1)
                console.log(this.noteSequence);
                e.target.className =  'sequencer-button'

                return;
            }

        }
        this.noteSequence.notes.push({
            isDrum: true,
            pitch: pitch,
            startTime: info.beat * beatTime,
            endTime: beatTime * info.beat + beatTime,
            quantizedStartStep: info.beat,
            quantizedEndStep: info.beat + 1
        })
        e.target.className =  'sequencer-button active'


    }

    createSequencer() {
        let width = this.container.offsetWidth;
        let height = this.container.offsetHeight;

        const buttonWidth = .8 * (width / numBeats);
        const buttonHeight = .8 * (height / numVoices);
        const buttonDiameter = Math.min(buttonWidth, buttonHeight)
        const verticalSpacing = (height - (buttonDiameter * (numVoices + 1))) / (numVoices - 1)
        let x = .1 * (width / numBeats)
        let y = 0

        for (let i = 0; i < numVoices; i++) {
            for (let beat = 0; beat < numBeats; beat++) {
                let newElement = document.createElement('div');
                newElement.style.position = 'absolute';
                newElement.style.left = x + 'px';
                newElement.style.top = y + 'px';
                newElement.style.width = buttonDiameter + 'px';
                newElement.style.height = buttonDiameter + 'px';
                newElement.className = 'sequencer-button'

                newElement.style.borderRadius = '50%'
                newElement.id = i + ':' + beat

                newElement.onclick = (e) => {
                    this.handleClick(e, {
                        part: i,
                        beat: beat
                    });
                }
                x += buttonWidth + (.2 * (width / numBeats))
                this.container.appendChild(newElement)
            }
            x = .1 * (width / numBeats)
            y += verticalSpacing + buttonDiameter
        }
    }

}