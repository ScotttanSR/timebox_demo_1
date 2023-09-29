import Resolver from '@forge/resolver';
import api, {route, storage} from '@forge/api';

const resolver = new Resolver();

resolver.define('getIssue', async (req) => {
  try {
    const issueId = req.context.extension.issue.key;
    const response = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/issue/${issueId}?fields=summary,description,status`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

    const data = await response.json();
    console.log('data in get issue', data);
    return data;
  } catch (error) {
    console.log(error);
  }
});

resolver.define('getUser', async (req) => {
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/myself`, {
      headers: {
        Accept: 'application/json',
      },
    });
    const data = await response.json();
    console.log(`Response: ${response.status} ${response.statusText}`);
    console.log(data);
    return data;
  } catch (error) {
    console.log(error);
  }
});

resolver.define('storeData', async (req) => {
  console.log('data will be store', req.payload);
  const {key, data} = req.payload;

  await storage.set(key, data);
});

resolver.define('getData', async (req) => {
  const {key} = req.payload;
  const storeData = await storage.get(key);
  console.log('storeData', storeData);
  if (storeData) {
    return storeData;
  }
  return null;
});

resolver.define('sendNotification', async (req) => {
  try {
    const issueId = req.context.extension.issue.id;
    const duration = req.payload.selectedDuration;
    console.log('payload:', req.payload.selectedDuration);

    var bodyData = `{
      "htmlBody": "Timer started for <strong>${duration}</strong> minutes",
      "subject": "Started Timebox Timer",
      "textBody": "View results for this ticket are now available.",
      "to": {
        "assignee": true
      }
    }`;

    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${issueId}/notify`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: bodyData,
      });

    console.log(`Response: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Handle the error and return an error message or null if needed
    return null;
  }
});

resolver.define('sendNotificationFinish', async (req) => {
  try {
    const issueId = req.context.extension.issue.id;
    const issueKey = req.context.extension.issue.key;
    console.log('payload:', req.payload.selectedDuration);

    var bodyData = `{
      "htmlBody": "Timer already end for <strong>${issueKey}</strong>",
      "subject": "Timebox Timer Finish!",
      "textBody": "View results for this ticket are now available.",
      "to": {
        "assignee": true
      }
    }`;

    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${issueId}/notify`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: bodyData,
      });

    console.log(`Response: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Handle the error and return an error message or null if needed
    return null;
  }
});

export const handler = resolver.getDefinitions();

export const updateIssue = async (event, context) => {
  const currentStatus = event.issue.fields.status.name;
  const eventId = event.issue.key;
  const storageData = await getData(eventId);
  if (!storageData) {
    const newTimeLog = {
      timeLog: {
        isRunning: currentStatus !== 'To Do' && currentStatus !== 'Done',
        startTime:
          currentStatus === 'To Do' || currentStatus === 'Done'
            ? null
            : new Date(),
        status: currentStatus,
      },
      timeLogsHistory: [],
    };
    storeData(eventId, newTimeLog);
  } else {
    const associatedStatuses = event.associatedStatuses;
    const timeLogsHistory = storageData.timeLogsHistory;
    const now = new Date();
    const startedDate = new Date(storageData.timeLog.startTime);
    const elapsedSeconds = Math.floor((now - startedDate) / 1000);
    const newEntry = {
      startTime: startedDate,
      endTime: new Date().toISOString(),
      elapsedTime: elapsedSeconds,
      status: associatedStatuses[0].name,
    };
    timeLogsHistory.push(newEntry);
    const newData = {
      ...storageData,
      timeLog: {
        isRunning: currentStatus !== 'To Do' && currentStatus !== 'Done',
        startTime:
          currentStatus === 'To Do' || currentStatus === 'Done'
            ? null
            : new Date(),
        status: currentStatus,
      },
      timeLogsHistory: timeLogsHistory,
    };
    storeData(eventId, newData);
  }
};

const getData = async (key) => {
  const storeData = await storage.get(key);
  if (storeData) {
    return storeData;
  }
  return null;
};

const storeData = async (key, data) => {
  await storage.set(key, data);
};
