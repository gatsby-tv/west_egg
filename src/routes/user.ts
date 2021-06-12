import {
  ErrorMessage,
  GetUserAccountRequest,
  GetUserAccountResponse,
  GetUserFeedsRequest,
  GetUserHandleExistsRequest,
  GetUserHandleExistsResponse,
  GetUserPromotionsRequest,
  NotFound,
  PostAuthCompleteSignUpResponse,
  PostUserCompleteSignupRequest,
  PutUserAvatarRequestParams,
  PutUserAvatarResponse,
  PutUserBannerRequestParams,
  PutUserBannerResponse,
  PutUserHandleRequest,
  PutUserHandleRequestParams,
  PutUserHandleResponse,
  PutUserSubscriptionRequest,
  PutUserSubscriptionRequestParams,
  PutUserSubscriptionResponse,
  StatusCode
} from "@gatsby-tv/types";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { keys as keysOf } from "ts-transformer-keys";
import { PersistSignInKey } from "../entities/PersistSignInKey";
import { SignInKey } from "../entities/SignInKey";
import { User } from "../entities/User";
import { isAuthenticated, validateSignup } from "../middleware/auth";
import { upload } from "../middleware/multipart";
import {
  hasPermissionToPutUserRequest,
  validatePutUserHandleRequest
} from "../middleware/user";
import { project } from "../utilities";

const router = Router();

/**
 * GET /user/{:id, :handle}
 */
router.get(
  // :unique can be either :id or :handle
  "/:unique",
  async (req, res, next) => {
    try {
      const params = req.params as GetUserAccountRequest;

      let user;
      try {
        const id = new Types.ObjectId(params.unique);
        user = await User.findById(
          id,
          project(keysOf<GetUserAccountResponse>())
        );
      } catch (error) {
        // Not a mongo object id, try with handle
        user = await User.findOne(
          { handle: params.unique },
          project(keysOf<GetUserAccountResponse>())
        );
      }

      if (!user) {
        throw new NotFound(ErrorMessage.USER_NOT_FOUND);
      }

      res.status(StatusCode.OK).json(user.toJSON() as GetUserAccountResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /user
 */
router.post("/", validateSignup, async (req, res, next) => {
  try {
    const body = req.body as PostUserCompleteSignupRequest;

    // Check if signinKey exists
    const signinKey =
      (await PersistSignInKey.findOne({ key: body.key })) ||
      (await SignInKey.findOne({ key: body.key }));
    if (!signinKey) {
      throw new NotFound(ErrorMessage.SIGNIN_KEY_NOT_FOUND);
    }

    // TODO: Is there a better way to handle this "constructor" with typing?
    // TODO: https://mongoosejs.com/docs/middleware.html mongoose validation hooks
    const user = new User({
      handle: body.handle,
      name: body.name,
      email: signinKey.email,
      creationDate: Date.now()
    });
    await user.save();

    // Sign a jwt with the user
    const token = jwt.sign(user.toJSON(), process.env.JWT_SECRET!, {
      expiresIn: "4w"
    });

    // Drop the signin key or persist signin key (if exists)
    signinKey.remove();

    res
      .status(StatusCode.CREATED)
      .json({ token } as PostAuthCompleteSignUpResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /user/:handle/exists
 */
router.get("/:handle/exists", async (req, res, next) => {
  try {
    const params = req.params as GetUserHandleExistsRequest;
    const user = await User.findOne(
      { handle: params.handle },
      project(keysOf<GetUserHandleExistsResponse>())
    );

    if (!user) {
      throw new NotFound(ErrorMessage.USER_NOT_FOUND);
    }

    res
      .status(StatusCode.OK)
      .json(user.toJSON() as GetUserHandleExistsResponse);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /user/:id/feeds TODO: Should this be private?
 */
router.get("/:id/feeds", async (req, res, next) => {
  try {
    const params = req.params as GetUserFeedsRequest;
    const user = await User.findById(params.id);
    if (!user) {
      throw new NotFound(ErrorMessage.USER_NOT_FOUND);
    }
    // TODO: Should this be a combination of subscriptions and followed users? (as GetUserFeedsResponse)
    res.status(StatusCode.OK).json([user.subscriptions, user.following]);
  } catch (error) {
    next(error);
  }
});
/**
 * GET /user/:id/promotions TODO: Should this be private?
 */
router.get("/:id/promotions", async (req, res, next) => {
  const params = req.params as GetUserPromotionsRequest;
  const user = await User.findById(params.id);
  if (!user) {
    throw new NotFound(ErrorMessage.USER_NOT_FOUND);
  }
  // TODO: as GetUserPromotionsResponse
  res.status(StatusCode.OK).json(user.promotions);
});

/**
 * PUT /user/:id/handle
 */
router.put(
  "/:id/handle",
  isAuthenticated,
  hasPermissionToPutUserRequest,
  validatePutUserHandleRequest,
  async (req, res, next) => {
    try {
      const body = req.body as PutUserHandleRequest;
      const params = req.params as PutUserHandleRequestParams;

      const user = await User.findById(
        params.id,
        project(keysOf<PutUserHandleResponse>())
      );
      if (!user) {
        throw new NotFound(ErrorMessage.USER_NOT_FOUND);
      }

      user.handle = body.handle;
      await user.save();

      res
        .status(StatusCode.CREATED)
        .json(user.toJSON() as PutUserHandleResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /user/:id/avatar
 */
router.put(
  "/:id/avatar",
  isAuthenticated,
  hasPermissionToPutUserRequest,
  upload,
  async (req, res, next) => {
    try {
      const params = req.params as PutUserAvatarRequestParams;

      const user = await User.findById(
        params.id,
        project(keysOf<PutUserAvatarResponse>())
      );
      if (!user) {
        throw new NotFound(ErrorMessage.USER_NOT_FOUND);
      }

      // TODO: Unpin the old avatar (not case where two users have same exact avatar hash?)

      // Get the file uploaded and add to the user
      user.avatar = req.ipfsContent!;
      user.save();

      res
        .status(StatusCode.CREATED)
        .json(user.toJSON() as PutUserAvatarResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /user/:id/banner
 */
router.put(
  "/:id/banner",
  isAuthenticated,
  hasPermissionToPutUserRequest,
  upload,
  async (req, res, next) => {
    try {
      const params = req.params as PutUserBannerRequestParams;

      const user = await User.findById(
        params.id,
        project(keysOf<PutUserBannerResponse>())
      );
      if (!user) {
        throw new NotFound(ErrorMessage.USER_NOT_FOUND);
      }

      // TODO: Unpin the old banner (not in case where two users have the same banner)
      user.banner = req.ipfsContent!;
      user.save();

      res
        .status(StatusCode.CREATED)
        .json(user.toJSON() as PutUserBannerResponse);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /user/:id/subscription
 */
router.put(
  "/:id/subscription",
  isAuthenticated,
  hasPermissionToPutUserRequest,
  async (req, res, next) => {
    try {
      const body = req.body as PutUserSubscriptionRequest;
      const params = req.params as PutUserSubscriptionRequestParams;

      const user = await User.findById(
        params.id,
        project(keysOf<PutUserSubscriptionResponse>())
      );
      if (!user) {
        throw new NotFound(ErrorMessage.USER_NOT_FOUND);
      }

      // TODO: Prevent subscription to the same channel twice (set)
      user.subscriptions.push(body.subscription);
      user.save();

      res
        .status(StatusCode.CREATED)
        .json(user.toJSON() as PutUserSubscriptionResponse);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
