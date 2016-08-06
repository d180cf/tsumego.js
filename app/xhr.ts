function send(method: string, url: string, data?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest;

        xhr.open(method, url, true);

        if (data !== undefined)
            xhr.send(data);
        else
            xhr.send();

        xhr.onreadystatechange = (event) => {
            if (xhr.readyState == xhr.DONE) {
                if (xhr.status >= 200 && xhr.status < 300)
                    resolve(xhr.responseText);
                else
                    reject(Error(method + ' ' + url + ' => ' + xhr.status));
            }
        };
    });
}
