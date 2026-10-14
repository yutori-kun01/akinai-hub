'use client';
import {useEffect} from 'react';
// Sends one page view per load with the URL's ref/utm parameters. Failures are ignored; the page never waits on it.
export default function PageView({owner,pageId}:{owner:string;pageId:string}){useEffect(()=>{fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner,pageId,search:location.search}),keepalive:true}).catch(()=>{});},[owner,pageId]);return null;}
