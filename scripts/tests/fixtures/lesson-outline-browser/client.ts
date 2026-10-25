export function createClient() {
  return {rpc:async(name:string,args:unknown)=>{
    const response=await fetch(`/fixture/rpc?case=${new URLSearchParams(location.search).get('case')}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});
    if(!response.ok)throw Error('Local fixture unavailable');
    return response.json();
  }};
}
