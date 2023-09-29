import React, { useEffect, useState } from 'react';
import { invoke, events } from "@forge/bridge";
import Button, {ButtonGroup} from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import { Label } from '@atlaskit/form';
import Select from '@atlaskit/select';
import Avatar from '@atlaskit/avatar';

function App() {
  const [selectedDuration, setSelectedDuration] = useState('');
  const [duration, setDuration] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [issueID, setIssueID] = useState(null);
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [snapshotDuration, setSnapshotDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userPicURL, setUserPicURL] = useState('');
  const [timerPause, setTimerPause] = useState(false);
  const [pauseRemainingDuration, setPauseRemainingDuration] = useState("");
  //time log 
  const [timeLogs, setTimeLogs] = useState([]);
  const [timeLogsIsRunning, setTimeLogsIsRunning] = useState(false);
  const [timeLogsElapsedTime, setTimeLogsElapsedTime] = useState(0);
  const [timeLogStartDate, setTimeLogStartDate] = useState(null);
  const [timeLogsCurrentState, setTimeLogsCurrentState] = useState({});
  const [currentStatus, setCurrentStatus] = useState();
  const [timeLogsHistory, setTimeLogsHistory] = useState([]);



  const handleDurationChange = (event) => {
    console.log("event:", event.value)
    setSelectedDuration(event.value);
  };
  const dataType = {
    "snapshotDuration": snapshotDuration,
    "snapshotDate": snapshotDate,
    "isRunning": timerRunning,
    "isPause": timerPause,
    "remainingDuration": pauseRemainingDuration,
    "userStarted": userName,
    "timeLog": timeLogsCurrentState,
    "timeLogsHistory": timeLogsHistory
  }

  const getData = async (key) => {
    return await invoke('getData', {key});
  }

  //setStorage api
  const storeData = async (key, data) => {
    await invoke('storeData', {key, data});
  }


  const handleStart = () => {
    const durationInSeconds = parseInt(selectedDuration, 10) * 60;
    const dataToStore = {
      ...dataType,
      "snapshotDuration": durationInSeconds,
      "snapshotDate": new Date(),
      "isRunning": true,
      "isPause": false,
    }
    setDuration(durationInSeconds);
    setSnapshotDuration(durationInSeconds);
    setTimerRunning(true);
    setTimerPause(false);
    setSnapshotDate(new Date());

    storeData(issueID, dataToStore);
    console.log("successful start the timer");
    (async () => {
      try {
        await invoke('sendNotification', {selectedDuration});
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    })();
  };

  const handleStop = () => {
    if (issueID) {
      setTimerRunning(false);
      const updatedData = {...dataType, "isRunning":false};
      storeData(issueID, updatedData);
      clearInterval(timerInterval);
     }
  };

  const handlePause = () => {
    if (issueID) {
      if (timerPause) {
        setTimerPause(false);
        const now = new Date();
        const snapshotDateTime = new Date(snapshotDate);
        const elapsedSeconds = Math.floor((now - snapshotDateTime) / 1000);
        const newSnapShotDuration = duration + elapsedSeconds;
        const updatedData = {...dataType, "isPause":false, "snapshotDuration":newSnapShotDuration};
        setSnapshotDuration(newSnapShotDuration);
        storeData(issueID, updatedData);
      } else {
        setTimerPause(true);
        const updatedData = {...dataType, "isPause":true, "remainingDuration":duration};
        setPauseRemainingDuration(duration);
        storeData(issueID, updatedData);
      }
    }
  }

  //timelog function 
  const addTimeLogEntry = () => {
    const newTimeLogEntry = {
      startTime: new Date().toISOString(),
      endTime: null,
      elapsedTime: 0,
      isActive: true
    };
    setTimeLogs((prevTimeLogs) => [...prevTimeLogs, newTimeLogEntry]);
  };

  const updateTimeLogEntry = (endTime) => {
    setTimeLogs((prevTimeLogs) => 
      prevTimeLogs.map((entry) => {
        if (entry.isActive) {
          return { ...entry, endTime };
        }
        return entry;
        }
      )
    );
  };

  const handleStartForTimeLog = () => {
    addTimeLogEntry();
    setTimeLogsIsRunning(true);
    // store updated time log data 
    const currentState = {
      "isRunning": true, 
      "startTime": new Date().toISOString(), 
    }; 
    const updatedData = { 
      ...dataType,
      "timeLog":currentState
    };
    setTimeLogStartDate(new Date().toISOString());
    setTimeLogsCurrentState(currentState);
    storeData(issueID, updatedData);
  };
  
  const handleStopForTimeLog = () => {
    const endTime = new Date().toISOString();
    const currentState = {"isRunning": false,"startTime": null}
    setTimeLogsIsRunning(false);
    setTimeLogsElapsedTime(0);
    updateTimeLogEntry(endTime);
    // store updated time log data
    const updatedData = { 
      ...dataType,
      "timeLog": currentState, 
      };
    const completedTimeLog = {
      "startTime": timeLogStartDate,
      "endTime": endTime,
      "elapsedTime": timeLogsElapsedTime 
    };
    setTimeLogsHistory((prevHistory) => [...prevHistory, completedTimeLog]);
    updatedData.timeLogsHistory = [...(timeLogsHistory || []), completedTimeLog];
    storeData(issueID, updatedData);
    
  }

  const handleResetForTimeLog = () => {
    const currentState = {
      "isRunning": false,
      "startTime": null
    }
    const resetData = {
      ...dataType,
      "timeLog": currentState,
      "timeLogsHistory": []
    };
    setTimeLogsCurrentState(currentState);
    setTimeLogsHistory([]);
    setTimeLogs([]);
    storeData(issueID, resetData)
  }

  //Timelog
  useEffect(() => {
    // Function to update elapsed time for each entry
    const updateElapsedTimes = () => {
      setTimeLogs((prevTimeLogs) =>
        prevTimeLogs.map((entry) => {
          if (entry.endTime) {
            return entry; // No need to update if endTime is set
          }
          const startTime = new Date(entry.startTime);
          const elapsedSeconds = Math.floor(
            (new Date() - startTime) / 1000
          );
          setTimeLogsElapsedTime(elapsedSeconds);
          return {
            ...entry,
            elapsedTime: elapsedSeconds,
          };
        })
      );
      
      if (timeLogsIsRunning) {
        // Increment the elapsed time counter
       setTimeout(updateElapsedTimes, 1000); // Schedule the next update
      }
    };
    // Start the elapsed time updater
    updateElapsedTimes();
  
    return () => {
      // Clean up the updater on unmount
      clearTimeout(updateElapsedTimes);
    };
  }, [timeLogsIsRunning]);

  useEffect(() => {
    if (issueID !== null){
      // Fetch the current timer state from the server on component mount
      let storageData = {};
      // Using Storage API
      getData(issueID)
        .then((data) =>{
          storageData = data;
          
          if (storageData.isPause === true){
            setDuration(storageData.remainingDuration);
            setTimerRunning(storageData.isRunning);
            setTimerPause(storageData.isPause);
            setSnapshotDate(storageData.snapshotDate);
            setSnapshotDuration(storageData.snapshotDuration);
            setTimeLogsCurrentState(storageData.timeLog);
            setIsLoading(false);
          } else {
            const now = new Date();
            const snapshotDate = new Date(storageData.snapshotDate);
            const elapsedSeconds = Math.floor((now - snapshotDate) / 1000);
            const countdownDuration = storageData.snapshotDuration - elapsedSeconds;
            setDuration(countdownDuration);
            setTimerRunning(storageData.isRunning);
            setSnapshotDate(storageData.snapshotDate);
            setSnapshotDuration(storageData.snapshotDuration);
            setUserName(storageData.userStarted);
            setTimeLogsCurrentState(storageData.timeLog);
            setIsLoading(false);
          }
          //timelog
          if (storageData.timeLog && storageData.timeLog.isRunning) {
            const now = new Date();
            const startedDate = new Date(storageData.timeLog.startTime);
            const elapsedSeconds = Math.floor((now - startedDate)/ 1000);
            
            const initialTimeLogEntry = {
              startTime: storageData.timeLog.startTime,
              endTime: null,
              elapsedTime: elapsedSeconds,
            };
            setTimeLogStartDate(storageData.timeLog.startTime);
            setTimeLogs([initialTimeLogEntry]);
            setTimeLogsCurrentState(storageData.timeLog);
            setTimeLogsIsRunning(true);
            setCurrentStatus(storageData.timeLog.status);
            setIsLoading(false);
          }
        })
        .catch((error) => {
          console.error("error fetching data:", error);
          setIsLoading(false);
        });
    }
  }, [issueID]);


  useEffect(() => {
    let timeoutId;
    const updateTimer = () => {
      if (timerRunning && duration > 0 && !timerPause) {
        setDuration((prevDuration) => prevDuration - 1);
        timeoutId = setTimeout(updateTimer, 1000); // Schedule the next update
      } else if (duration === 0) {
        handleStop();
      }
    };

    // Start the timer when issueID is not null, timerRunning is true, and duration > 0
    if (issueID !== null && timerRunning && duration > 0) {
      timeoutId = setTimeout(updateTimer, 1000); // Start the timer
    } else if (duration <= 0 && timerRunning) {
      handleStop();
      (async () => {
        try {
          await invoke('sendNotificationFinish');
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      })();
    }
  
    return () => {
      clearTimeout(timeoutId); // Clean up the timeout on unmount or timer stop
    };
  }, [issueID, timerRunning, duration, timerPause]);

  

  // Function to format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const formatDate = (date) => {
    const utcDate = new Date(date);
    const kulOptions = {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,

    };
    const kulDataStr = utcDate.toLocaleDateString('en-US', kulOptions);
    return kulDataStr;
  };


  //get issue key
  useEffect(() => {
    (async () => {
      // Can be done using resolvers
      // To get the issue details, i.e. summary and description
      const data = await invoke('getIssue');
      const userName = await invoke('getUser');
      setIssueID(data.key);
      setUserName(userName.displayName);
      setUserPicURL(userName.avatarUrls["48x48"])
    })();
    return () => {};
  }, []); 

  
  if (issueID !== null && isLoading == false){
    return (
      <div>
        <h1>Timebox</h1>
        {timerRunning ? (
          <>
            <h3 style={{marginBottom: "25px"}}>Countdown: {formatTime(duration)}</h3>
            <ButtonGroup appearance='primary'>
              <Button onClick={handleStop}>Stop Timer</Button>
              <Button onClick={handlePause}>{timerPause ? ("Resume Timer") : ("Pause Timer")}</Button>
            </ButtonGroup>
            <p style={{display: 'flex', alignItems: 'center'}}>
              Timer started by&nbsp; <strong>{userName}</strong>
              <Avatar 
                appearance="circle"
                src={userPicURL}
                size="small"
                name={userName}
              />
            </p>
            <p>Date/Time: <strong>{formatDate(snapshotDate)}</strong></p>
          </>
        ) : (
          <>
            <div style={{marginTop: "20px"}}>
              <Label htmlFor="durationSelect"> 
                Select Duration:
              </Label>
              <Select
                inputId="durationSelect"
                appearance="default"
                onChange={handleDurationChange}
                isDisabled={timerRunning}
                pageSize={2}
                options={[
                  { label: '1 minutes', value: '1' },
                  { label: '5 minutes', value: '5' },
                  { label: '10 minutes', value: '10' },
                  { label: '15 minutes', value: '15' },
                ]}
                placeholder="Select"
              />
              <br/>
              <Button appearance="primary" onClick={handleStart} isDisabled={!selectedDuration || timerRunning}>Start Timer</Button>
            </div>
          </>
        )}
        <hr/>
        <div>
          <h1>TimeLog</h1>
            {timeLogsIsRunning && (
              <div>
                <strong>Start Time:</strong> {formatDate(timeLogs[0].startTime)}<br />
                <strong>End Time:</strong> Counting...<br />
                <strong>Elapsed Time:</strong> {formatElapsedTime(timeLogsElapsedTime)}<br />
                <strong>Status:</strong> {currentStatus}
              </div>
            )}
          <ButtonGroup appearance="primary"> 
            {timeLogsIsRunning ? (
              <Button onClick={handleStopForTimeLog}>Stop</Button>
            ):(
              <Button onClick={handleStartForTimeLog}>Start</Button>
            )}
            <Button onClick={handleResetForTimeLog}>Reset</Button>
          </ButtonGroup>
        </div>
      </div>
    );
  } else {
    return <Spinner interactionName="load" />
  }
}

export default App;
