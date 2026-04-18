const Joi = require('joi');

/**
 * 候选人实现要求：
 * 定义 submitJob 校验：body 至少包含一个 payload 对象（可为空 {}）
 */
const submitJob = {
  body: Joi.object().keys({
    // TODO: 定义 payload 字段校验
    payload: Joi.object().default({}),
  }),
};

module.exports = { submitJob };
