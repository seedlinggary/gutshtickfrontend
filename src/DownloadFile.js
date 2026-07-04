





import { useState, useEffect } from "react"

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click(); 
  }
async function DownloadFile(gppd, infor,address) {
    console.log('inside func')
    console.log(infor)
    let backend = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
    let cookie = localStorage.getItem('cookie')
    const requestOptions = {
        method: gppd,
        headers: { 'Content-Type': 'application/json',
        'x-access-token': cookie
        },
        // body: JSON.stringify(infor)
    };
    try {
        const response = await fetch(`${backend}${address}`, requestOptions);
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson && await response.json();

        console.error('There was a response!', response);

        if (!response.ok) {
            const error = (data && data.message) || response.status;
            throw error;
        }
        response.blob().then((blob) => {
            saveBlob(blob, 'Investor_CSV');
         });

        // console.error('There was data!', data);
        // console.log(data)
        // return data;
    } catch (error) {
        console.error('There was an error!', error);
        throw error;
    }
}
export default DownloadFile




// import { useState, useEffect } from "react"
// import {reactLocalStorage} from 'reactjs-localstorage';

// const DownloadFile = (url, options) => {
//     const [data, setData] = useState(null)
//     const [isPending, setIsPending] = useState(true)
//     const [error, setError] = useState(null)
//     let backend = 'http://127.0.0.1:5000'
//     // let backend = 'https://good-shtick.onrender.com'

//     // let backend = 'https://distributionresolutionapi.com'
//     useEffect(() => {
//         const abortCont = new AbortController();
//         options.signal = abortCont.signal
        
//             fetch(backend + url, options)
//                 .then(res => {
//                     if (res.status == 401){
//                         reactLocalStorage.remove('cookie')
//                         reactLocalStorage.remove('email')
//                         console.log(res)
//                         window.location.href='/signin'
//                                       }
//                     if (!res.ok) {
//                         throw Error('Couldnt fetch data')
//                     }
//                     return res.json();
//                 })
//                 .then(data => {
//                     setData(data)
//                     setIsPending(false)
//                     setError(null)
//                     data.blob().then((blob) => {
//                         saveBlob(blob, 'Investor_CSV');
//                      });
//                 })
//                 .catch(err => {
//                     if (err.name === 'AbortError'){
//                         console.log('fetch aborted')
//                     }else{
//                         setIsPending(false)
//                         setError(err.message)    
//                     }
//                 })
        
//         // console.log('use effect ran')
//         return () => abortCont.abort
//     }, [url]);
//     return { data, isPending, error }
// }

// export default DownloadFile

// const downloadcsv = (e) => {
    
       
//     let backend = 'https://distributionresolutionapi.com'
//     let address = `/downloadcsv`
//     const requestOptions = {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(info)
//     };
//     fetch(`${backend}${address}`, requestOptions)
//         .then((response) => {
//           response.blob().then((blob) => {
//              saveBlob(blob, 'waterfallDistribution');
//           });
//     });

//     e.preventDefault();
//     }    
