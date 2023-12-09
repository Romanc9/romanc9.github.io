---
title: hexo博客如何插入图片
date: 2020-11-11 19:56:58
tags: 博客
category: 博客

---

# hexo博客如何插入图片

在直白的文章中，图片总是点睛之笔的

用markdow写的博客，想插入些图片，但是发现不管是直接拖进来也好，还是链接引用，在md文件显示正常，但是不管是本地端hexo s,还是远程域名，博客页面端都无法显示图片，因为照片没有地址/链接，markdown调用的是本地文件夹





<img src="C:\Users\12456\Pictures\微信图片_20200826185343.jpg" alt="微信图片_20200826185343" style="zoom: 25%;" />







   <img style="border-radius: 0.3125em;    box-shadow: 0 2px 4px 0 rgba(34,36,38,.12),0 2px 10px 0 rgba(34,36,38,.08);"     src="https://s3.ax1x.com/2020/11/11/BvM5kR.jpg" height=120/>  

因此，查找万能的Google，选用如下办法



## 1. 利用图床获得图片链接



进入网站https://imgchr.com/（无需梯子，免费), 上传照片，获得链接



> <img src="https://s3.ax1x.com/2020/11/11/BvtdnP.png" border="0" />

## 2. 在markdown文档中插入图片链接

- 直接复制链接（第二行/第四行）粘贴到文档里时注意删掉    href的<> / 后面括号()里的链接    ，不然点图片是进入链接，不是放大



- #### 简单点（中间链接是图片URL)

```text
<img src="https://s3.ax1x.com/2020/11/11/BvtQ0K.jpg">
```





## 3. HTML格式小tips：

### 注释

- 给图片添加注释，居中，一点小渲染

  在markdown中插入如下html代码

```
<center>
    <img style="border-radius: 0.3125em;
    box-shadow: 0 2px 4px 0 rgba(34,36,38,.12),0 2px 10px 0 rgba(34,36,38,.08);" 
    src="这里输入图片URL链接">
    <br>
    <div style="color:orange; border-bottom: 1px solid #d9d9d9;
    display: inline-block;
    color: #999;
    padding: 2px;">这里输入注释</div>
</center>

```







### 缩放

- html图片在markdown中无缩放选项，需利用html代码来实现，详情见[html教程](https://www.w3school.com.cn/tags/att_img_height-width.asp)
- **简单点**：**在img标签里面只设置宽，不设置高，图片就会等比例缩放。**)(好像改变height/width效果一样的)



# 更新(转载他人的办法,不用图床法)

### 方法一：

(1)在hexo目录下，安装插件：

```text
npm install hexo-asset-image --save
```

(2)在hexo\source 目录下新建一个img文件夹，把图片放置在里面；
(3)在xxx.md文件中引用图片：

```
![header]( img/header.jpg)
```

![nw](nw.jpg)



### 方法二：

(1)在全局配置文件（`hexo/config.yml`)中:

```
post_asset_folder: true
```

做了这个修改的效果是，
新建文章post时，会自动生成和文章名相同的文件夹。
这个文件夹存放当前文章所用图片的地方。

以 `$ hexo new "文章"` 为例，结构如下：

```
文章
├── picture1.jpg
├── picture2.jpg
└── picture3.jpg
文章.md
```



(2)创建文章（在创建的时候，会在hexo/source/_post目录下，生成一个XXX.md文件和一个XXX的文件夹）：

```
hexo new "XXX"
```

(3)把XXX这个博文需要展示的图片放在XXX文件夹目录下；
(4)在XXX.md文件中*相对路径*引入图片的方式：

```text
![alt](test.jpg)
```



<img src="hexo博客如何插入图片/nw.jpg" alt="nw" style="zoom: 25%;" />





------

完事

<center>
    <img style="border-radius: 0.3125em;
    box-shadow: 0 2px 4px 0 rgba(34,36,38,.12),0 2px 10px 0 rgba(34,36,38,.08);" 
    src="https://s3.ax1x.com/2020/11/11/BvtQ0K.jpg"> 
</center>

