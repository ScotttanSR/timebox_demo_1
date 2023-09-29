import React, { useEffect, useState } from 'react';
import Spinner from '@atlaskit/spinner';
import { invoke } from "@forge/bridge";


function App() {
  const [issueID, setIssueID] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLogsHistory, setTimeLogsHistory] = useState([]);

  const totalElapsedTime  = timeLogsHistory.reduce((accumulator, currentValue) => {
    return accumulator + currentValue.elapsedTime;
  }, 0);

  const getData = async (key) => {
    return await invoke('getData', {key});
  }

  //get issue key
  useEffect(() => {
    (async () => {
      // Can be done using resolvers
      // To get the issue details, i.e. summary and description
      const data = await invoke('getIssue');
      setIssueID(data.key);
    })();
    return () => {};
  }, []); 

  useEffect(() => {
    if (issueID !== null){
      // Fetch the current timer state from the server on component mount
      let storageData = {};
      // Using Storage API
      getData(issueID)
        .then((data) =>{
          storageData = data;
          if (storageData.timeLogsHistory && Array.isArray(storageData.timeLogsHistory)) {
            setTimeLogsHistory(storageData.timeLogsHistory);
          }
        })
        .catch((error) => {
          console.error("error fetching data:", error);
        })
        .finally(() => setIsLoading(false)); 
    }
  }, [issueID]);

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

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (isLoading) {
    return <Spinner interactionName="load" />
  }
  return (
    <div>
      <ul style={{marginBottom: "20px"}}>
        {timeLogsHistory.map((log, index) => (
          <li key={index}>
            <strong>Start Time:</strong> {formatDate(log.startTime)}<br />
            <strong>End Time:</strong> {log.endTime ? formatDate(log.endTime) : 'In Progress'}<br />
            <strong>Elapsed Time:</strong> {log.elapsedTime ? formatElapsedTime(log.elapsedTime) : '00:00:00'} <br />
            <strong>Status:</strong> {log.status}
          </li>
        ))}     
      </ul>
      {timeLogsHistory.length > 0 && (
        <strong>Total Time: {formatElapsedTime(totalElapsedTime)}</strong>
      )}
    </div>
  );
}

export default App;
