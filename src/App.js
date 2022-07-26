import React, {useEffect, useRef, useState, Component} from 'react'
import './App.css';
import { Howl, State } from 'howler' ;

import { initNotifications, notify } from '@mycv/f8-notification';

import soundURL from './assets/sound_warning.mp3';
import { div, time } from '@tensorflow/tfjs';
const mobilenet = require('@tensorflow-models/mobilenet');
const tf = require('@tensorflow/tfjs');
const knnClassifier = require('@tensorflow-models/knn-classifier');


var sound = new Howl({
  src: [soundURL]
});



const FIRST = 'first';
const SECOND = 'second';
const train_time =100;
const CONFIDENCES_RATIO = 0.8;

function App() {
 
  const video = useRef();
  
  const  classifier = useRef();
  const  canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [filled, setFilled] = useState (false);
  const [counter, setCounter] = useState ('Ready');
  
 

  const init = async () => {
    console.log('init..');
    await setupCamera();
    console.log('setup success');
    
      classifier.current = await knnClassifier.create();
      mobilenetModule.current = await mobilenet.load();
    
 

    console.log('Set updone');
    console.log('First possition press Train 1');
    
    initNotifications({ cooldown: 3000});
  }

  const setupCamera = () => {
    return new Promise((resolve, reject)=> {
       navigator.getUserMedia = navigator.getUserMedia ||
       navigator.webkitGetUserMedia ||
       navigator.mozGetUserMedia ||
       navigator.msGetUserMedia;

        if (navigator.getUserMedia) {
          navigator.getUserMedia(
            { video:true },
            stream => {
              video.current.srcObject = stream;
              video.current.addEventListener('loadeddata', resolve);
            },
            error => reject(error)
          );
        } else {
          reject();
        }
    });
  }

  const train = async label => {
    console.log (`[${label}] Tranning parse`);
    
    setCounter('In process')
    for (let i=0; i < train_time; i++) {
        
        let time = (`Progress ${parseInt((i+1) / train_time * 100)}% `);
        console.log (time);
        await training(label);
        
      }
    setCounter('Done')
  } 
  





  const training = label => {
    return new Promise(async resolve  => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
        await sleep(100);
        resolve();
    });
    
  }



  const run = async () => {
    const embedding = mobilenetModule.current.infer (
      video.current,
      true
    );

    const result = await classifier.current.predictClass(embedding);

    console.log ('Label: ', result.label);
    console.log ('Label: ', result.confidences);

      if (result.label !== FIRST &&
          result.confidences[result.label] > CONFIDENCES_RATIO   
        ) {
            console.log('Warning');
            setCounter('Warning');

          if (canPlaySound.current) {
            canPlaySound.current=false;
            sound.play();
          }
                   
          notify('Warning', { body:'Find solution' });
          setFilled(true);
        } 
        else {
          console.log('Safe');
          setFilled(false);
          setCounter('Safe');
        }

    await sleep(200); 
    run();
  } 

  const sleep = (ms=0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const reset = async () =>{
   await init();
   setCounter('Ready');
  }

  useEffect(() => {
    init();
    
    sound.on('end', function(){
      canPlaySound.current = true;
    });

    //cleanup
    return () => {

    }
  }, []);
  
  return (
    <div className= {`main ${filled ? 'filled': ''}`}>
      <div className="header"> 
        <div> Test app </div>
      </div>
      
      <div className="container">

      <div className="noti">
        
        <h1>
       {counter}
       
        </h1>
      </div>

      <video
        ref={video}
        className="video"
        autoPlay
      />

      <div className="control">
        <button className="btn" onClick={() => train(FIRST) } >Train 1</button>
        <button className="btn" onClick={() => train(SECOND)} >Train 2</button>
        <button className="btn" onClick={() => run()}>Start</button>
        <button className="btn" onClick={() => reset()}>Reset</button>
      </div>
      </div>
    </div>
  );
}

export default App;
