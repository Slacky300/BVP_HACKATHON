const asyncHandler = require("express-async-handler");
const {User} = require('../models/userModel');
const {Emergency} = require('../models/emergencyModel')

const {sendHelpEmail} = require('../utils/email')
const axios = require('axios')
let pincode;
let formattedAddress;


const getData = async(url) => {

  try{
    
    let {data} = await axios.get(url)
    
    return data
  }catch(e){
    console.log(e.message);
  }
}

const sendemergencyCntrl = asyncHandler(async (req, res) => {
  
  const {userId, lat, long} = req.body;
  if(!lat || !long){
    res.status(403).json({message: "latitude or longitude is missing"})
  }
  const resp = await getData(`https://apis.mapmyindia.com/advancedmaps/v1/efd1bc9e76b7a36cb990af517a48f3c3/rev_geocode?lat=${lat}&lng=${long}`)
  pincode = resp.results[0].pincode;
  formattedAddress = resp.results[0].formatted_address;
  const  user = await User.findById(userId);
  const recipients = [user.emergencyMail];
  recipients.push()
  if(!user){
    res.status(404).json({message: "User not found"})
  }
  
  
  const users = await User.find({pinCode: pincode});
  if(users){
    for(const x of users){
      recipients.push(x.email);
    }
  }

  await sendHelpEmail(recipients, lat, long , user.uname, pincode,formattedAddress);

  const emergency = await Emergency.create({
    user: userId,
    emergencyLctOnMap: `https://maps.google.com/maps?q=${lat},${long}&hl=en&z=14&amp`,
    addressOfIncd: formattedAddress
  })

  res.status(200).json({message: "Sent an SOS for help"})
  

  // ---------------------------------------fetching-Pin-api-------------------------------------------------------
});


const getAllEmergencies = asyncHandler(async(req,res) => {
  const data = []
  const emer = await Emergency.find({});
  for(const x of emer){
    const user = await User.findById(x.user);
    if(user){
      data.push({
        _id: x._id,
        mapLct: x.emergencyLctOnMap,
        addressOfInc: x.addressOfIncd,
        username: user.uname,
        userId: user._id,
        emergencyNo: user.emergencyNo,
        isResolved: x.isResolved
      })
    }
  }
  res.status(200).json(data)
});


const getSinglEmergency = asyncHandler(async(req,res) => {
  const id = req.params.id;
  const emergency = await Emergency.findById(id);
  if(emergency){
    emergency.isResolved = true;
    await emergency.save();
    const user = await User.findById(emergency.user)
    if(user){
      res.status(200).json({
        
          _id: emergency._id,
          mapLct: emergency.emergencyLctOnMap,
          addressOfInc: emergency.addressOfIncd,
          username: user.uname,
          emergencyNo: user.emergencyNo,
          isResolved: emergency.isResolved
        
      })
    }

    
  }
})

module.exports = { sendemergencyCntrl,getAllEmergencies,getSinglEmergency };
