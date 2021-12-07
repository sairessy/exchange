const express = require('express')
const collections = require('./src/database/database')
const cookieParser = require('cookie-parser')
const { posts } = require('./src/database/database')
const app = express()
app.use(express.static('public'))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`App: ${PORT}`)
})

app.get('/login', async (req, res) => {
    if (req.cookies.user !== undefined) {
        res.sendFile(__dirname + '/public/dashboard.html')
    } else {
        res.sendFile(__dirname + '/public/login.html')
    }
})

app.get('/recoverypassword', async (req, res) => {
    res.sendFile(__dirname + '/public/recoverypassword.html')
})

app.get('/signup', async (req, res) => {
    if (req.cookies.user !== undefined) {
        res.sendFile(__dirname + '/public/dashboard.html')
    } else {
        res.sendFile(__dirname + '/public/signup.html')
    }
})

app.get('/dashboard', async (req, res) => {
    if (req.cookies.user !== undefined) {
        res.sendFile(__dirname + '/public/dashboard.html')
    } else {
        res.sendFile(__dirname + '/public/login.html')
    }
})

app.get('/logout', (req, res) => {
    res.clearCookie('user', {})
    res.redirect('/login')
})

// 
app.get('/profileinfo', async (req, res) => {

    let result = [];

    if (req.cookies.user !== undefined) {
        result = await new Promise((resolve, reject) => {
            collections.users.find({ _id: req.cookies.user }, (err, data) => {
                resolve(data)
            })
        })
    }

    res.json(result)
})

app.get('/userposts', async (req, res) => {

    let result = [];

    if (req.cookies.user !== undefined) {
        result = await new Promise((resolve, reject) => {
            collections.posts.find({ user: req.cookies.user, removed: false }, (err, data) => {
                resolve(data)
            })
        })
    }

    res.json(result)
})

app.get('/removepost/:id', (req, res) => {
    const post = req.params.id

    collections.posts.update({ _id: post }, {
        $set: {
            removed: true
        }
    }, { multi: true }, function (err, numReplaced) {
        // console.log(numReplaced)
    })

    res.json({ success: true })

})

app.get('/likepost/:id', (req, res) => {
    if (req.cookies.user !== undefined) {
        const id = req.params.id
        collections.posts.find({ _id: id }, (err, data) => {
            const post = data[0]
            if (post.likes !== undefined) {
                const likes = post.likes
                const likesIds = post.likes.map(l => l.user)
                if (!likesIds.includes(req.cookies.user)) {
                    collections.posts.update({ _id: id }, {
                        $set: {
                            likes: [...likes, { user: req.cookies.user }]
                        }
                    }, { multi: true }, function (err, numReplaced) {
                        // console.log(numReplaced)
                    })
                } else {
                    collections.posts.update({ _id: id }, {
                        $set: {
                            likes: likes.filter(lk => lk.user !== req.cookies.user)
                        }
                    }, { multi: true }, function (err, numReplaced) {
                        // console.log(numReplaced)
                    })
                }
            } else {
                collections.posts.update({ _id: id }, {
                    $set: {
                        likes: [{ user: req.cookies.user }]
                    }
                }, { multi: true }, function (err, numReplaced) {
                    // console.log(numReplaced)
                })
            }
        })

        res.json({ success: true })
    } else {
        res.json({ success: false })
    }

})

app.post('/commentpost', (req, res) => {
    let comment = req.body

    if (req.cookies.user !== undefined) {
        comment.user = req.cookies.user
        collections.posts.find({ _id: comment.id }, (err, data) => {
            let _comments = []

            if (data[0].comments !== undefined) {

                const comments = data[0].comments
                collections.posts.update({ _id: comment.id }, {
                    $set: {
                        comments: [...comments, { ...comment, time: Date.now().toString() }]
                    }
                }, { multi: true }, function (err, numReplaced) {
                    console.log(numReplaced)
                })
            } else {
                _comments.push({ ...comment, time: Date.now().toString() })
                collections.posts.update({ _id: comment.id }, {
                    $set: {
                        comments: _comments
                    }
                }, { multi: true }, function (err, numReplaced) {
                    console.log(numReplaced)
                })
            }
        })
        res.json({ success: true })
    } else {
        res.json({ success: false })
    }
})

app.get('/posts', async (req, res) => {

    const result = await new Promise(async (resolve, reject) => {
        collections.posts.find({ removed: false }, async (err, _data) => {
            const data = _data;

            for (let indx = 0; indx < data.length; indx++) {
                const d = data[indx];
                let info = []

                if (d.comments != undefined) {
                    for (let index = 0; index < d.comments.length; index++) {
                        const c = d.comments[index];

                        info = await new Promise((resolve, reject) => {
                            collections.users.find({ _id: c.user }, (err, users) => {

                                const fullName = users[0].fullName
                                resolve({ fullName, contact })
                            })
                        })

                        d.comments[index].userInfo = info
                    }
                }

            }

            resolve(data)
        })
    })

    for (let i = 0; i < result.length; i++) {
        const post = result[i];
        result[i].userInfo = await new Promise((resolve, reject) => {
            collections.users.find({ _id: post.user }, (err, data) => {
                resolve({
                    fullName: data.length > 0 ? data[0].fullName : '',
                    contact: data.length > 0 ? data[0].contact : '',
                    zone: data.length > 0 ? data[0].zone : ''
                })
            })
        })
    }

    for (let i = 0; i < result.length; i++) {
        const post = result[i];

        if (post.img != undefined && post.img != '') {
            result[i].img = await new Promise((resolve, reject) => {
                collections.postsImages.findOne({ name: post.img }, (err, data) => {
                    if (data != null) {
                        resolve(data.img)
                    } else {
                        resolve('')
                    }
                })
            })
        } else {
            post.img = ''
        }

    }

    res.json({
        user: req.cookies.user !== undefined ? req.cookies.user : '',
        posts: result
    })
})

app.get('/posts/category/:id', async (req, res) => {
    const result = await new Promise(async (resolve, reject) => {
        collections.posts.find({ removed: false, category: req.params.id }, async (err, _data) => {
            const data = _data;

            for (let indx = 0; indx < data.length; indx++) {
                const d = data[indx];
                let info = []

                if (d.comments != undefined) {
                    for (let index = 0; index < d.comments.length; index++) {
                        const c = d.comments[index];

                        info = await new Promise((resolve, reject) => {
                            collections.users.find({ _id: c.user }, (err, users) => {

                                const fullName = users[0].fullName
                                resolve({ fullName, contact })
                            })
                        })

                        d.comments[index].userInfo = info
                    }
                }

            }

            resolve(data)
        })
    })

    for (let i = 0; i < result.length; i++) {
        const post = result[i];
        result[i].userInfo = await new Promise((resolve, reject) => {
            collections.users.find({ _id: post.user }, (err, data) => {
                resolve({
                    fullName: data.length > 0 ? data[0].fullName : '',
                    contact: data.length > 0 ? data[0].contact : '',
                    zone: data.length > 0 ? data[0].zone : ''
                })
            })
        })
    }

    for (let i = 0; i < result.length; i++) {
        const post = result[i];

        if (post.img != undefined && post.img != '') {
            result[i].img = await new Promise((resolve, reject) => {
                collections.postsImages.findOne({ name: post.img }, (err, data) => {
                    if (data != null) {
                        resolve(data.img)
                    } else {
                        resolve('')
                    }
                })
            })
        } else {
            post.img = ''
        }

    }

    res.json({
        user: req.cookies.user !== undefined ? req.cookies.user : '',
        posts: result
    })
})



app.get('/checksession', async (req, res) => {
    let result = []

    if (req.cookies.user !== undefined) {
        result = await new Promise((resolve, reject) => {
            collections.users.find({ _id: req.cookies.user }, (err, data) => {
                resolve(data)
            })
        })
    }

    res.json(result)
})


// 
app.post('/signup', (req, res) => {
    const data = req.body
    data.contact = ''
    collections.users.insert(data, (err, doc) => { })
    res.json({ success: true })
})

app.post('/login', async (req, res) => {
    const data = req.body

    const result = await new Promise((resolve, reject) => {
        collections.users.findOne({ email: data.email, pass: data.pass }, (err, data) => {
            resolve(data)
        })
    })

    if (result != null) {
        res.cookie('user', result._id, {})
    }

    res.json({ success: result != null })
})

// Save image to database if available
async function uploadPhotoToFirebase(name, base64) {
    const data = { name, base64 }
    console.log(data)

    return {
        success: true,
        url: '',
        name
    }
}

app.post('/post', (req, res) => {
    const data = req.body
    const img = data.img
    const ext = data.ext
    data.img = ''
    let photo = null

    if (req.cookies.user != undefined) {
        let name = Date.now().toString()

        if (img != null) {
            data.img = name

            // uploadPhotoToFirebase(name + '.' + ext, img)
            // const resUploadPhoto = uploadPhotoToFirebase(name + '.' + ext, img)

            // if (resUploadPhoto.success) {
            //     photo = {
            //         name: resUploadPhoto.name,
            //         url: resUploadPhoto.url
            //     }
            // }
        }

        data.time = name
        data.user = req.cookies.user

        collections.posts.insert(data, (err, doc) => {
            if (img != null) {
                collections.postsImages.insert({
                    name,
                    post: doc._id,
                    img,
                    photo
                })
            }
        })

        res.json({ success: true })
    } else {
        res.json({ success: false })
    }

})

app.post('/updateprofile', (req, res) => {
    const data = req.body

    collections.users.update({ _id: req.cookies.user }, {
        $set: {
            fullName: data.fullName, email: data.email,
            zone: data.zone, contact: data.contact
        }
    }, { multi: true }, function (err, numReplaced) {
        // console.log(numReplaced)
    })

    res.json({ success: true })
})

app.post('/editcomment', (req, res) => {
    console.log(req.body)
    res.json({ success: false })
})

app.post('/removepost', (req, res) => {
    console.log(req.body)
    res.json({ success: false })
})

app.post('/sendrecoverycode', (req, res) => {
    const data = req.body
    const email = data.email
    const code = Math.random().toString().substr(2, 5)

    collections.users.update({ email: data.email }, {
        $set: {
            recoverycode: code
        }
    }, { multi: true }, function (err, numReplaced) {
        // console.log(numReplaced)
    })

    // Sent email to "email" with code "code"

    res.json({ success: true })
})

app.post('/recoverypassword', (req, res) => {
    const data = req.body
    console.log(data)
    collections.users.update({ email: data.email, recoverycode: data.code }, {
        $set: {
            pass: data.pass
        }
    }, { multi: true }, function (err, numReplaced) {
        res.json({ success: numReplaced > 0 })
    })
})