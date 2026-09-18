module.exports=async(req,res)=>{res.setHeader('Set-Cookie','tdg_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');res.status(200).json({authenticated:false})};
