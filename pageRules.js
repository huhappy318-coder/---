const PageClassifier = (() => {
  const RULES = {
    shopping: {
      hostnames: [
        "taobao.com",
        "tmall.com",
        "jd.com",
        "pinduoduo.com",
        "vip.com",
        "suning.com",
        "dangdang.com",
        "amazon.com",
        "amazon.cn",
        "ebay.com"
      ]
    },
    video: {
      hostnames: ["bilibili.com", "iqiyi.com", "v.qq.com", "youku.com", "mgtv.com", "youtube.com", "netflix.com"]
    },
    social: {
      hostnames: [
        "weibo.com",
        "douyin.com",
        "reddit.com",
        "x.com",
        "twitter.com",
        "instagram.com"
      ]
    },
    article: {
      hostnames: [
        "mp.weixin.qq.com",
        "toutiao.com",
        "thepaper.cn",
        "36kr.com",
        "ifeng.com",
        "people.com.cn",
        "xinhuanet.com",
        "wikipedia.org",
        "nytimes.com",
        "theguardian.com",
        "medium.com",
        "substack.com"
      ]
    },
    workStudy: {
      hostnames: [
        "docs.qq.com",
        "feishu.cn",
        "feishu.com",
        "notion.so",
        "yuque.com",
        "kdocs.cn",
        "icourse163.org",
        "coursera.org",
        "edx.org",
        "openai.com",
        "developer.chrome.com",
        "github.com"
      ]
    }
  };

  function hostnameMatches(hostname, expected) {
    return hostname === expected || hostname.endsWith(`.${expected}`);
  }

  function detectZhihu(pathname) {
    if (pathname.startsWith("/question/") || pathname.startsWith("/tardis/zm/art")) {
      return "article";
    }

    if (pathname.startsWith("/column/") || pathname.startsWith("/p/")) {
      return "article";
    }

    return "social";
  }

  function detectXiaohongshu(pathname) {
    if (pathname.startsWith("/goods-detail/") || pathname.startsWith("/discovery/item/")) {
      return "shopping";
    }
    return "social";
  }

  function detectGithub(pathname) {
    if (pathname.startsWith("/explore") || pathname.startsWith("/trending")) {
      return "social";
    }
    return "workStudy";
  }

  function detectOpenAi(pathname) {
    if (pathname.startsWith("/index/") || pathname.startsWith("/blog/")) {
      return "article";
    }
    return "workStudy";
  }

  function classify(urlString) {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname.toLowerCase();

      if (hostnameMatches(hostname, "zhihu.com")) {
        return detectZhihu(pathname);
      }

      if (hostnameMatches(hostname, "xiaohongshu.com")) {
        return detectXiaohongshu(pathname);
      }

      if (hostnameMatches(hostname, "github.com")) {
        return detectGithub(pathname);
      }

      if (hostnameMatches(hostname, "openai.com")) {
        return detectOpenAi(pathname);
      }

      for (const [type, rule] of Object.entries(RULES)) {
        if ((rule.hostnames || []).some((item) => hostnameMatches(hostname, item))) {
          return type;
        }
      }
    } catch (error) {
      return "default";
    }

    return "default";
  }

  return {
    RULES,
    classify
  };
})();
