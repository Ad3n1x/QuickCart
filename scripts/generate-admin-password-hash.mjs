import bcrypt from "bcryptjs";

if(!process.stdin.isTTY||!process.stdin.setRawMode){
  console.error("Run this script in an interactive terminal so the password can be entered without echoing.");
  process.exit(1);
}
const readHidden=label=>new Promise((resolve,reject)=>{
  const input=process.stdin;let value="";
  process.stdout.write(label);
  input.setRawMode(true);input.resume();input.setEncoding("utf8");
  const finish=()=>{input.setRawMode(false);input.pause();input.removeListener("data",onData);process.stdout.write("\n");};
  const onData=chunk=>{
    for(const char of chunk){
      if(char==="\u0003"){finish();reject(new Error("Cancelled."));return;}
      if(char==="\r"||char==="\n"){finish();resolve(value);return;}
      if(char==="\u007f"||char==="\b"){value=value.slice(0,-1);continue;}
      if(char>=" "&&char<="~"&&value.length<128)value+=char;
    }
  };
  input.on("data",onData);
});
try{
  const first=await readHidden("Choose a new admin password (14+ characters): ");
  const second=await readHidden("Confirm admin password: ");
  if(first.length<14)throw new Error("Use at least 14 characters.");
  if(first!==second)throw new Error("Passwords do not match.");
  const hash=await bcrypt.hash(first,12);
  process.stdout.write("\nADMIN_PASSWORD_HASH (copy this value into Render; do not commit it):\n"+hash+"\n");
}catch(error){console.error(error.message);process.exitCode=1;}
