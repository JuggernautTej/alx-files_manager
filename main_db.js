import dbClient from './utils/db';

const waitConnection = () => {
    return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = async () => {
            setTimeout(async () => {
                i += 1;
                if (i >= 10) {
                    reject();
                }
                else if(!dbClient.isAlive()) {
                    repeatFct();
                }
                else {
                    resolve();
                }
            }, 1000);
        };
        repeatFct();
    });
};

(async () => {
    try {
        console.log(dbClient.isAlive());
        await waitConnection();
        console.log(dbClient.isAlive());
        console.log(await dbClient.nbUsers());
        console.log(await dbClient.nbFiles());
    } catch (err) {
        console.error('Error:', err);
        if (err && err.message) {
            console.error('Error message:', err.message); // Log the message property if it exists
        }
    }
})();
